import type { Tool } from "../../mvp/02-tool/07-unified-tool-interface/types.js"
import type {
  ModelMessage,
  Session,
  SessionMessage,
  ToolCall,
} from "../../mvp/05-context/06-minimal-context-runtime/types.js"
import { prepareContext } from "../../mvp/05-context/06-minimal-context-runtime/context-runtime.js"
import type {
  ApprovalDecision,
  PermissionApprovalRequest,
  PermissionRuntime,
} from "../../mvp/07-permission/06-minimal-permission-runtime/permission-runtime.js"
import type { ToolCapableProvider } from "../02-read-think-answer/tool-capable-provider.js"

export type CodingLoopOptions = {
  llm: ToolCapableProvider
  readTool: Tool
  writeTool: Tool
  runTestTool: Tool
  permissionRuntime: PermissionRuntime
  systemPrompt: string
  projectContext?: string
  historyMaxUnits?: number
  maxSteps: number
}

export type CodingLoopInput = {
  prompt: string
  session?: Session
  maxSteps?: number
}

export type CodingToolTrace = {
  step: number
  toolCallId: string
  toolName: string
  rawArguments: string
  result: string
}

export type CodingLoopState = {
  step: number
  maxSteps: number
  messages: ModelMessage[]
  trace: CodingToolTrace[]
  runStartMessageIndex: number
}

export type PendingCodingApproval = {
  request: PermissionApprovalRequest
  state: CodingLoopState
  toolCall: ToolCall
  remainingToolCalls: ToolCall[]
}

export type PendingStoppedCodingRun = {
  state: CodingLoopState
  remainingToolCalls: ToolCall[]
}

type CodingLoopBaseResult = {
  steps: number
  trace: CodingToolTrace[]
  runMessages: SessionMessage[]
}

export type CodingLoopResult =
  | (CodingLoopBaseResult & {
      status: "done"
      reason: "final_answer"
      answer: string
    })
  | (CodingLoopBaseResult & {
      status: "approval_required"
      request: PermissionApprovalRequest
      pending: PendingCodingApproval
    })
  | (CodingLoopBaseResult & {
      status: "stopped"
      reason: "max_steps"
      pending: PendingStoppedCodingRun
    })

export type MultiStepCodingAgent = {
  start(input: CodingLoopInput): Promise<CodingLoopResult>
  startFromMessages(
    messages: ModelMessage[],
    maxSteps?: number,
  ): Promise<CodingLoopResult>
  resume(
    pending: PendingCodingApproval,
    approval: ApprovalDecision,
  ): Promise<CodingLoopResult>
  resumeStopped(
    pending: PendingStoppedCodingRun,
    additionalSteps: number,
  ): Promise<CodingLoopResult>
}

type ToolBatchResult =
  | {
      status: "complete"
    }
  | {
      status: "approval_required"
      request: PermissionApprovalRequest
      pending: PendingCodingApproval
    }

function validateMaxSteps(maxSteps: number): void {
  if (!Number.isInteger(maxSteps) || maxSteps <= 0) {
    throw new Error(`maxSteps must be a positive integer, received: ${maxSteps}`)
  }
}

function getToolCalls(toolCalls: ToolCall[] | undefined): ToolCall[] {
  return toolCalls ? [...toolCalls] : []
}

function requireFinalAnswer(content: string | null): string {
  const answer = content?.trim()
  if (!answer) {
    throw new Error("Model returned neither tool calls nor a final answer")
  }
  return answer
}

function findTool(toolCall: ToolCall, tools: Tool[]): Tool {
  const tool = tools.find(
    (candidate) => candidate.name === toolCall.function.name,
  )

  if (!tool) {
    throw new Error(`Unknown tool: ${toolCall.function.name}`)
  }

  return tool
}

function appendToolObservation(
  state: CodingLoopState,
  toolCall: ToolCall,
  result: string,
): void {
  state.trace.push({
    step: state.step,
    toolCallId: toolCall.id,
    toolName: toolCall.function.name,
    rawArguments: toolCall.function.arguments,
    result,
  })

  state.messages.push({
    role: "tool",
    tool_call_id: toolCall.id,
    content: result,
  })
}

function getRunMessages(state: CodingLoopState): SessionMessage[] {
  return state.messages.slice(state.runStartMessageIndex) as SessionMessage[]
}

function baseResult(state: CodingLoopState): CodingLoopBaseResult {
  return {
    steps: state.step,
    trace: [...state.trace],
    runMessages: getRunMessages(state),
  }
}

function stoppedResult(
  state: CodingLoopState,
  remainingToolCalls: ToolCall[] = [],
): CodingLoopResult {
  return {
    ...baseResult(state),
    status: "stopped",
    reason: "max_steps",
    pending: {
      state,
      remainingToolCalls: [...remainingToolCalls],
    },
  }
}

function createState(
  messages: ModelMessage[],
  maxSteps: number,
): CodingLoopState {
  validateMaxSteps(maxSteps)

  const first = messages[0]
  const last = messages.at(-1)

  if (!first || first.role !== "system") {
    throw new Error("Coding Loop messages must start with a system message")
  }

  if (!last || last.role !== "user") {
    throw new Error("Coding Loop messages must end with the current user task")
  }

  return {
    step: 0,
    maxSteps,
    messages: [...messages],
    trace: [],
    // prepareContext / compactIfNeeded 都保证当前 Task 是最后一条 user。
    // Session 只需要回写这一条 user 以及它之后新产生的 assistant / tool。
    runStartMessageIndex: messages.length - 1,
  }
}

export function createMultiStepCodingAgent(
  options: CodingLoopOptions,
): MultiStepCodingAgent {
  validateMaxSteps(options.maxSteps)

  const historyMaxUnits = options.historyMaxUnits ?? 6
  const tools = [options.readTool, options.writeTool, options.runTestTool]

  async function processToolBatch(
    state: CodingLoopState,
    toolCalls: ToolCall[],
  ): Promise<ToolBatchResult> {
    for (let index = 0; index < toolCalls.length; index += 1) {
      const toolCall = toolCalls[index]
      if (!toolCall) {
        throw new Error(`Missing tool call at batch index ${index}`)
      }

      const tool = findTool(toolCall, tools)

      if (tool.name === options.writeTool.name) {
        const permissionResult = await options.permissionRuntime.start(toolCall)

        if (permissionResult.status === "approval_required") {
          return {
            status: "approval_required",
            request: permissionResult.request,
            pending: {
              request: permissionResult.request,
              state,
              toolCall,
              remainingToolCalls: toolCalls.slice(index + 1),
            },
          }
        }

        if (permissionResult.status === "blocked") {
          appendToolObservation(
            state,
            toolCall,
            `write_file blocked by permission: ${permissionResult.reason}`,
          )
          continue
        }

        appendToolObservation(
          state,
          toolCall,
          permissionResult.toolResult,
        )
        continue
      }

      const toolResult = await tool.execute(toolCall.function.arguments)
      appendToolObservation(state, toolCall, toolResult)
    }

    return { status: "complete" }
  }

  async function continueLoop(state: CodingLoopState): Promise<CodingLoopResult> {
    while (state.step < state.maxSteps) {
      state.step += 1

      const response = await options.llm.chat({
        messages: state.messages,
        tools,
      })

      state.messages.push(response.message)

      const toolCalls = getToolCalls(response.message.tool_calls)

      if (toolCalls.length === 0) {
        return {
          ...baseResult(state),
          status: "done",
          reason: "final_answer",
          answer: requireFinalAnswer(response.message.content),
        }
      }

      // 最后一个 Model Turn 产生的 Tool Call 当前不执行，避免 maxSteps 之外继续产生副作用。
      // 但把这批 Tool Call 留在 PendingStoppedCodingRun 里，Integration 05 可以从这里 Resume，
      // 而不是重新执行前面的 Tool。
      if (state.step >= state.maxSteps) {
        return stoppedResult(state, toolCalls)
      }

      const batchResult = await processToolBatch(state, toolCalls)

      if (batchResult.status === "approval_required") {
        return {
          ...baseResult(state),
          status: "approval_required",
          request: batchResult.request,
          pending: batchResult.pending,
        }
      }
    }

    return stoppedResult(state)
  }

  async function resumeRemainingToolCalls(
    state: CodingLoopState,
    toolCalls: ToolCall[],
  ): Promise<CodingLoopResult | undefined> {
    if (toolCalls.length === 0) {
      return undefined
    }

    const batchResult = await processToolBatch(state, toolCalls)

    if (batchResult.status === "approval_required") {
      return {
        ...baseResult(state),
        status: "approval_required",
        request: batchResult.request,
        pending: batchResult.pending,
      }
    }

    return undefined
  }

  return {
    async start(input) {
      const prompt = input.prompt.trim()
      if (!prompt) {
        throw new Error("prompt must not be empty")
      }

      const context = prepareContext({
        systemPrompt: options.systemPrompt,
        currentTask: prompt,
        session: input.session ?? { messages: [] },
        projectContext: options.projectContext,
        policy: {
          history: {
            type: "recent_units",
            maxUnits: historyMaxUnits,
          },
        },
      })

      const state = createState(
        context.messages,
        input.maxSteps ?? options.maxSteps,
      )

      return continueLoop(state)
    },

    async startFromMessages(messages, maxSteps = options.maxSteps) {
      const state = createState(messages, maxSteps)
      return continueLoop(state)
    },

    async resume(pending, approval) {
      const permissionResult = await options.permissionRuntime.resume(
        pending.request,
        approval,
      )

      const observation =
        permissionResult.status === "executed"
          ? permissionResult.toolResult
          : `write_file rejected by approval: ${permissionResult.reason}`

      appendToolObservation(
        pending.state,
        pending.toolCall,
        observation,
      )

      const pausedAgain = await resumeRemainingToolCalls(
        pending.state,
        pending.remainingToolCalls,
      )

      return pausedAgain ?? continueLoop(pending.state)
    },

    async resumeStopped(pending, additionalSteps) {
      validateMaxSteps(additionalSteps)

      // Resume 不是从头开始：保留原 messages / trace / step，
      // 只把 Runtime 允许的 Model Turn 上限向后扩展。
      pending.state.maxSteps += additionalSteps

      const paused = await resumeRemainingToolCalls(
        pending.state,
        pending.remainingToolCalls,
      )

      return paused ?? continueLoop(pending.state)
    },
  }
}
