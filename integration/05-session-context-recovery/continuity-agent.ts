import type {
  Session as StoredSession,
  SessionStore,
} from "../../mvp/04-session/04-multiple-sessions/session-store.js"
import { getOrCreateSession } from "../../mvp/04-session/04-multiple-sessions/session-store.js"
import { prepareContext } from "../../mvp/05-context/06-minimal-context-runtime/context-runtime.js"
import type {
  ModelMessage,
  Session as ContextSession,
  SessionMessage as ContextSessionMessage,
  ToolCall,
} from "../../mvp/05-context/06-minimal-context-runtime/types.js"
import { compactIfNeeded } from "../../mvp/06-compaction/06-minimal-compaction-runtime/compaction-runtime.js"
import type {
  ApprovalDecision,
  PermissionApprovalRequest,
} from "../../mvp/07-permission/06-minimal-permission-runtime/permission-runtime.js"
import {
  createCheckpoint,
  type RecoveryCheckpoint,
} from "../../mvp/08-recovery/04-checkpoint-snapshot/checkpoint.js"
import { rollbackCheckpoint } from "../../mvp/08-recovery/05-resume-rollback/recover.js"
import type {
  CodingLoopResult,
  CodingToolTrace,
  MultiStepCodingAgent,
  PendingCodingApproval,
  PendingStoppedCodingRun,
} from "../04-multi-step-coding-loop/coding-loop.js"

export type ContinuityAgentOptions = {
  codingAgent: MultiStepCodingAgent
  sessionStore: SessionStore
  systemPrompt: string
  projectContext?: string
  historyMaxUnits?: number
  defaultMaxSteps: number
  snapshotFiles: string[]
  compaction: {
    tokenBudget: number
    keepHotUnits: number
    apiKey: string
    baseUrl: string
    model: string
  }
}

export type ContinuityRunInput = {
  sessionId: string
  prompt: string
  maxSteps?: number
}

export type ContinuityContextStats = {
  compacted: boolean
  beforeTokens: number
  afterTokens: number
  selectedUnits: number
}

type RunEnvelope = {
  session: StoredSession
  checkpoint: RecoveryCheckpoint
  contextStats: ContinuityContextStats
}

export type ContinuityPendingApproval = {
  envelope: RunEnvelope
  codingPending: PendingCodingApproval
}

export type ContinuityPendingRecovery = {
  envelope: RunEnvelope
  codingPending: PendingStoppedCodingRun
}

type ContinuityBaseResult = {
  sessionId: string
  steps: number
  trace: CodingToolTrace[]
  contextStats: ContinuityContextStats
}

export type ContinuityRunResult =
  | (ContinuityBaseResult & {
      status: "done"
      answer: string
      sessionMessages: number
    })
  | (ContinuityBaseResult & {
      status: "approval_required"
      request: PermissionApprovalRequest
      pending: ContinuityPendingApproval
    })
  | (ContinuityBaseResult & {
      status: "recovery_required"
      reason: "max_steps"
      pending: ContinuityPendingRecovery
    })

export type ContinuityRollbackResult = {
  status: "rolled_back"
  sessionId: string
  checkpointId: string
  sessionMessages: number
}

export type ContinuityAgent = {
  start(input: ContinuityRunInput): Promise<ContinuityRunResult>
  resumeApproval(
    pending: ContinuityPendingApproval,
    approval: ApprovalDecision,
  ): Promise<ContinuityRunResult>
  resumeRecovery(
    pending: ContinuityPendingRecovery,
    additionalSteps: number,
  ): Promise<ContinuityRunResult>
  rollback(
    pending: ContinuityPendingRecovery | ContinuityPendingApproval,
  ): Promise<ContinuityRollbackResult>
  getSession(sessionId: string): StoredSession
}

function normalizeToolCall(toolCall: {
  id?: string
  type?: string
  function?: {
    name?: string
    arguments?: string
  }
}): ToolCall {
  const id = toolCall.id
  const type = toolCall.type
  const name = toolCall.function?.name
  const rawArguments = toolCall.function?.arguments

  if (!id || type !== "function" || !name || rawArguments === undefined) {
    throw new Error("Stored Session contains an incomplete Tool Call")
  }

  return {
    id,
    type: "function",
    function: {
      name,
      arguments: rawArguments,
    },
  }
}

function toContextSession(session: StoredSession): ContextSession {
  const messages: ContextSessionMessage[] = session.messages.map((message) => {
    if (message.role === "user") {
      return {
        role: "user",
        content: message.content,
      }
    }

    if (message.role === "tool") {
      return {
        role: "tool",
        tool_call_id: message.tool_call_id,
        content: message.content,
      }
    }

    return {
      role: "assistant",
      content: message.content,
      ...(message.tool_calls
        ? { tool_calls: message.tool_calls.map(normalizeToolCall) }
        : {}),
    }
  })

  return { messages }
}

function appendCompletedRun(
  session: StoredSession,
  runMessages: ContextSessionMessage[],
): void {
  // Context 的严格 ToolCall 结构可以安全写回 Session 的较宽 ToolCall 结构。
  session.messages.push(...runMessages)
}

function resultBase(
  envelope: RunEnvelope,
  result: CodingLoopResult,
): ContinuityBaseResult {
  return {
    sessionId: envelope.session.id,
    steps: result.steps,
    trace: [...result.trace],
    contextStats: envelope.contextStats,
  }
}

export function createContinuityAgent(
  options: ContinuityAgentOptions,
): ContinuityAgent {
  if (options.snapshotFiles.length === 0) {
    throw new Error("Continuity Agent requires at least one snapshot file")
  }

  if (!Number.isInteger(options.defaultMaxSteps) || options.defaultMaxSteps <= 0) {
    throw new Error("defaultMaxSteps must be a positive integer")
  }

  async function finalize(
    envelope: RunEnvelope,
    result: CodingLoopResult,
  ): Promise<ContinuityRunResult> {
    if (result.status === "done") {
      appendCompletedRun(envelope.session, result.runMessages)

      return {
        ...resultBase(envelope, result),
        status: "done",
        answer: result.answer,
        sessionMessages: envelope.session.messages.length,
      }
    }

    if (result.status === "approval_required") {
      return {
        ...resultBase(envelope, result),
        status: "approval_required",
        request: result.request,
        pending: {
          envelope,
          codingPending: result.pending,
        },
      }
    }

    return {
      ...resultBase(envelope, result),
      status: "recovery_required",
      reason: "max_steps",
      pending: {
        envelope,
        codingPending: result.pending,
      },
    }
  }

  return {
    async start(input) {
      const session = getOrCreateSession(
        options.sessionStore,
        input.sessionId,
      )
      const prompt = input.prompt.trim()

      if (!prompt) {
        throw new Error("prompt must not be empty")
      }

      // Session 保存完整历史；Context Runtime 决定这一轮实际发送什么。
      const context = prepareContext({
        systemPrompt: options.systemPrompt,
        currentTask: prompt,
        session: toContextSession(session),
        projectContext: options.projectContext,
        policy: {
          history: {
            type: "recent_units",
            maxUnits: options.historyMaxUnits ?? 6,
          },
        },
      })

      // Compaction 位于 Context 和 Coding Loop 之间。
      // within budget 时不会产生额外总结调用；over budget 时才压缩 Cold History。
      const compacted = await compactIfNeeded({
        context,
        tokenBudget: options.compaction.tokenBudget,
        keepHotUnits: options.compaction.keepHotUnits,
        apiKey: options.compaction.apiKey,
        baseUrl: options.compaction.baseUrl,
        model: options.compaction.model,
      })

      const checkpoint = await createCheckpoint(
        `integration05:${session.id}:${Date.now()}`,
        options.snapshotFiles,
      )

      const envelope: RunEnvelope = {
        session,
        checkpoint,
        contextStats: {
          compacted: compacted.compacted,
          beforeTokens: compacted.beforeTokens,
          afterTokens: compacted.afterTokens,
          selectedUnits: context.stats.selectedUnits,
        },
      }

      const result = await options.codingAgent.startFromMessages(
        compacted.context.messages as ModelMessage[],
        input.maxSteps ?? options.defaultMaxSteps,
      )

      return finalize(envelope, result)
    },

    async resumeApproval(pending, approval) {
      const result = await options.codingAgent.resume(
        pending.codingPending,
        approval,
      )

      return finalize(pending.envelope, result)
    },

    async resumeRecovery(pending, additionalSteps) {
      const result = await options.codingAgent.resumeStopped(
        pending.codingPending,
        additionalSteps,
      )

      return finalize(pending.envelope, result)
    },

    async rollback(pending) {
      await rollbackCheckpoint(pending.envelope.checkpoint)

      // 未完成的 Run 从未写回 Session，所以 Rollback 只恢复工作区，
      // Session 仍然停留在上一个完整事实边界。
      return {
        status: "rolled_back",
        sessionId: pending.envelope.session.id,
        checkpointId: pending.envelope.checkpoint.id,
        sessionMessages: pending.envelope.session.messages.length,
      }
    },

    getSession(sessionId) {
      return getOrCreateSession(options.sessionStore, sessionId)
    },
  }
}
