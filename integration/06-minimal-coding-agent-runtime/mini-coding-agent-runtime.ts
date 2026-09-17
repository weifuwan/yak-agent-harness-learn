import { isAbsolute, relative, resolve, sep } from "node:path"
import {
  createSessionStore,
  type Session as StoredSession,
  type SessionStore,
} from "../../mvp/04-session/04-multiple-sessions/session-store.js"
import type { PermissionRule } from "../../mvp/07-permission/05-policy-precedence/policy-precedence.js"
import {
  createPermissionRuntime,
  type ApprovalDecision,
} from "../../mvp/07-permission/06-minimal-permission-runtime/permission-runtime.js"
import type { ToolCapableProvider } from "../02-read-think-answer/tool-capable-provider.js"
import {
  createIntegrationPermissionRules,
  createWorkspaceReadFileTool,
  createWorkspaceWriteFileTool,
} from "../03-read-edit-permission-write/workspace-tools.js"
import { createMultiStepCodingAgent } from "../04-multi-step-coding-loop/coding-loop.js"
import { createRunTestTool } from "../04-multi-step-coding-loop/run-test-tool.js"
import {
  createContinuityAgent,
  type ContinuityAgentOptions,
  type ContinuityPendingApproval,
  type ContinuityPendingRecovery,
  type ContinuityRollbackResult,
  type ContinuityRunInput,
  type ContinuityRunResult,
} from "../05-session-context-recovery/continuity-agent.js"

const DEFAULT_SYSTEM_PROMPT = [
  "你是一个最小 Coding Agent。",
  "你可以根据当前任务和会话历史决定调用 read_file、write_file、run_test，或者直接回答。",
  "涉及项目事实时先读取真实文件，不要猜。",
  "修改文件前先读取真实内容。",
  "write_file.content 必须是完整纯文本文件内容，不要使用 Markdown 代码围栏。",
  "write_file 只有在 Permission Runtime 允许后才算真正执行。",
  "修改完成后运行测试；只有 TEST_PASSED 后才能宣布修改完成。",
].join("\n")

export type CreateMiniCodingAgentRuntimeOptions = {
  llm: ToolCapableProvider
  workspaceRoot: string
  snapshotFiles: string[]
  compaction: ContinuityAgentOptions["compaction"]
  systemPrompt?: string
  projectContext?: string
  historyMaxUnits?: number
  maxSteps?: number
  sessionStore?: SessionStore
  permissionRules?: PermissionRule[]
}

export type MiniCodingAgentRuntime = {
  run(input: ContinuityRunInput): Promise<ContinuityRunResult>
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

function resolveWorkspacePath(workspaceRoot: string, filePath: string): string {
  const root = resolve(workspaceRoot)
  const absolutePath = isAbsolute(filePath)
    ? resolve(filePath)
    : resolve(root, filePath)
  const fromRoot = relative(root, absolutePath)

  const outside =
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot)

  if (outside) {
    throw new Error(`snapshot file is outside workspace: ${filePath}`)
  }

  return absolutePath
}

export function createMiniCodingAgentRuntime(
  options: CreateMiniCodingAgentRuntimeOptions,
): MiniCodingAgentRuntime {
  const workspaceRoot = options.workspaceRoot.trim()
  if (!workspaceRoot) {
    throw new Error("workspaceRoot must not be empty")
  }

  if (options.snapshotFiles.length === 0) {
    throw new Error("snapshotFiles must contain at least one workspace file")
  }

  const maxSteps = options.maxSteps ?? 8
  if (!Number.isInteger(maxSteps) || maxSteps <= 0) {
    throw new Error("maxSteps must be a positive integer")
  }

  const normalizedWorkspaceRoot = resolve(workspaceRoot)
  const snapshotFiles = options.snapshotFiles.map((filePath) =>
    resolveWorkspacePath(normalizedWorkspaceRoot, filePath),
  )

  const readTool = createWorkspaceReadFileTool(normalizedWorkspaceRoot)
  const writeTool = createWorkspaceWriteFileTool(normalizedWorkspaceRoot)
  const runTestTool = createRunTestTool(normalizedWorkspaceRoot)

  const permissionRuntime = createPermissionRuntime({
    tools: [writeTool],
    workspaceRoot: normalizedWorkspaceRoot,
    rules: options.permissionRules ?? createIntegrationPermissionRules(),
  })

  const systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT

  const codingAgent = createMultiStepCodingAgent({
    llm: options.llm,
    readTool,
    writeTool,
    runTestTool,
    permissionRuntime,
    systemPrompt,
    projectContext: options.projectContext,
    historyMaxUnits: options.historyMaxUnits,
    maxSteps,
  })

  const continuityAgent = createContinuityAgent({
    codingAgent,
    sessionStore: options.sessionStore ?? createSessionStore(),
    systemPrompt,
    projectContext: options.projectContext,
    historyMaxUnits: options.historyMaxUnits,
    defaultMaxSteps: maxSteps,
    snapshotFiles,
    compaction: options.compaction,
  })

  return {
    run(input) {
      return continuityAgent.start(input)
    },

    resumeApproval(pending, approval) {
      return continuityAgent.resumeApproval(pending, approval)
    },

    resumeRecovery(pending, additionalSteps) {
      return continuityAgent.resumeRecovery(pending, additionalSteps)
    },

    rollback(pending) {
      return continuityAgent.rollback(pending)
    },

    getSession(sessionId) {
      return continuityAgent.getSession(sessionId)
    },
  }
}
