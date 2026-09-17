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
  remainingToolCalls: ToolCall[]
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
              // 同一 Assistant Message 里的其余 Tool Call 还没有对应 Tool Result。
              // approve / reject 当前 write 后，必须继续把这一批处理完，
              // 才能进入下一次 LLM Turn。
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
          status: "done",
          reason: "final_answer",
          answer: requireFinalAnswer(response.message.content),
          steps: state.step,
          trace: [...state.trace],
        }
      }

      // maxSteps 统计 Model Turn，不统计同一 Turn 里的 Tool Call 数量。
      // 如果最后一个 Model Turn 又提出一批 Tool Call，则整批都不执行，
      // 避免超过模型步数以后继续产生副作用。
      if (state.step >= state.maxSteps) {
        return {
          status: "stopped",
          reason: "max_steps",
          steps: state.step,
          trace: [...state.trace],
        }
      }

      const batchResult = await processToolBatch(state, toolCalls)

      if (batchResult.status === "approval_required") {
        return {
          status: "approval_required",
          request: batchResult.request,
          pending: batchResult.pending,
          steps: state.step,
          trace: [...state.trace],
        }
      }
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

      // 一个 Assistant Message 可能一次给出多个 Tool Call。
      // 当前 write 审批完成后，先把同一批剩余 Tool Call 全部处理完，
      // 每个 Tool Call 都必须得到自己的 Tool Result，之后才能再次调用 LLM。
      const batchResult = await processToolBatch(
        pending.state,
        pending.remainingToolCalls,
      )

      if (batchResult.status === "approval_required") {
        return {
          status: "approval_required",
          request: batchResult.request,
          pending: batchResult.pending,
          steps: pending.state.step,
          trace: [...pending.state.trace],
        }
      }

      return continueLoop(pending.state)
    },
  }
}
