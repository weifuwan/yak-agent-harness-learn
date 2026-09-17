import type { Tool } from "../../mvp/02-tool/07-unified-tool-interface/types.js"
import type {
  ModelMessage,
  Session,
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
}

export type PendingCodingApproval = {
  request: PermissionApprovalRequest
  state: CodingLoopState
  toolCall: ToolCall
}

export type CodingLoopResult =
  | {
      status: "done"
      reason: "final_answer"
      answer: string
      steps: number
      trace: CodingToolTrace[]
    }
  | {
      status: "approval_required"
      request: PermissionApprovalRequest
      pending: PendingCodingApproval
      steps: number
      trace: CodingToolTrace[]
    }
  | {
      status: "stopped"
      reason: "max_steps"
      steps: number
      trace: CodingToolTrace[]
    }

export type MultiStepCodingAgent = {
  start(input: CodingLoopInput): Promise<CodingLoopResult>
  resume(
    pending: PendingCodingApproval,
    approval: ApprovalDecision,
  ): Promise<CodingLoopResult>
}

function validateMaxSteps(maxSteps: number): void {
  if (!Number.isInteger(maxSteps) || maxSteps <= 0) {
    throw new Error(`maxSteps must be a positive integer, received: ${maxSteps}`)
  }
}

function getSingleToolCall(toolCalls: ToolCall[] | undefined): ToolCall | undefined {
  if (!toolCalls || toolCalls.length === 0) {
    return undefined
  }

  if (toolCalls.length > 1) {
    throw new Error(
      `integration:04 intentionally supports one tool call per model turn, received ${toolCalls.length}`,
    )
  }

  return toolCalls[0]
}

function requireFinalAnswer(content: string | null): string {
  const answer = content?.trim()
  if (!answer) {
    throw new Error("Model returned neither a tool call nor a final answer")
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

export function createMultiStepCodingAgent(
  options: CodingLoopOptions,
): MultiStepCodingAgent {
  validateMaxSteps(options.maxSteps)

  const historyMaxUnits = options.historyMaxUnits ?? 6
  const tools = [options.readTool, options.writeTool, options.runTestTool]

  async function continueLoop(state: CodingLoopState): Promise<CodingLoopResult> {
    while (state.step < state.maxSteps) {
      state.step += 1

      const response = await options.llm.chat({
        messages: state.messages,
        tools,
      })

      state.messages.push(response.message)

      const toolCall = getSingleToolCall(response.message.tool_calls)

      if (!toolCall) {
        return {
          status: "done",
          reason: "final_answer",
          answer: requireFinalAnswer(response.message.content),
          steps: state.step,
          trace: [...state.trace],
        }
      }

      // 和 Agent Loop MVP 一样：如果当前已经到最大模型步数，
      // 不再执行这个新 Tool Call，避免 maxSteps 之后仍产生副作用。
      if (state.step >= state.maxSteps) {
        return {
          status: "stopped",
          reason: "max_steps",
          steps: state.step,
          trace: [...state.trace],
        }
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
            },
            steps: state.step,
            trace: [...state.trace],
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

    return {
      status: "stopped",
      reason: "max_steps",
      steps: state.step,
      trace: [...state.trace],
    }
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

      const state: CodingLoopState = {
        step: 0,
        maxSteps: options.maxSteps,
        messages: [...context.messages],
        trace: [],
      }

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

      return continueLoop(pending.state)
    },
  }
}
