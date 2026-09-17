import type { Tool } from "../../mvp/02-tool/07-unified-tool-interface/types.js"
import type {
  ModelContext,
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

export type EditableCodingAgentOptions = {
  llm: ToolCapableProvider
  readTool: Tool
  writeTool: Tool
  permissionRuntime: PermissionRuntime
  systemPrompt: string
  projectContext?: string
  historyMaxUnits?: number
}

export type EditableCodingAgentRunInput = {
  prompt: string
  session?: Session
}

export type ToolTrace = {
  toolCallId: string
  toolName: string
  rawArguments: string
  result?: string
}

export type PendingEdit = {
  request: PermissionApprovalRequest
  messages: ModelMessage[]
  context: ModelContext
  read: ToolTrace
  write: ToolTrace
}

export type EditableCodingAgentStartResult =
  | {
      status: "approval_required"
      request: PermissionApprovalRequest
      pending: PendingEdit
    }
  | {
      status: "done"
      outcome: "no_write" | "executed" | "blocked"
      answer: string
      context: ModelContext
      read?: ToolTrace
      write?: ToolTrace
    }

export type EditableCodingAgentResumeResult = {
  status: "done"
  outcome: "executed" | "rejected"
  answer: string
  context: ModelContext
  read: ToolTrace
  write: ToolTrace
}

export type EditableCodingAgent = {
  start(
    input: EditableCodingAgentRunInput,
  ): Promise<EditableCodingAgentStartResult>
  resume(
    pending: PendingEdit,
    approval: ApprovalDecision,
  ): Promise<EditableCodingAgentResumeResult>
}

function getSingleToolCall(toolCalls: ToolCall[] | undefined): ToolCall | undefined {
  if (!toolCalls || toolCalls.length === 0) {
    return undefined
  }

  if (toolCalls.length > 1) {
    throw new Error(
      `integration:03 intentionally supports one tool call per turn, received ${toolCalls.length}`,
    )
  }

  return toolCalls[0]
}

function requireFinalAnswer(content: string | null): string {
  const answer = content?.trim()
  if (!answer) {
    throw new Error("Model returned no final answer")
  }
  return answer
}

async function finishAfterWrite(options: {
  llm: ToolCapableProvider
  messages: ModelMessage[]
  toolCallId: string
  observation: string
}): Promise<string> {
  const response = await options.llm.chat({
    messages: [
      ...options.messages,
      {
        role: "tool",
        tool_call_id: options.toolCallId,
        content: options.observation,
      },
    ],
    // integration:03 到这里必须结束，不能继续长成多步骤 Loop。
    tools: [],
  })

  if (response.message.tool_calls?.length) {
    throw new Error(
      "integration:03 does not allow more tool calls after write_file; multi-step loops belong to integration:04",
    )
  }

  return requireFinalAnswer(response.message.content)
}

export function createEditableCodingAgent(
  options: EditableCodingAgentOptions,
): EditableCodingAgent {
  const historyMaxUnits = options.historyMaxUnits ?? 6

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

      // Turn 1: 只给 read_file。修改前必须先看到真实文件。
      const readResponse = await options.llm.chat({
        messages: context.messages,
        tools: [options.readTool],
      })

      const readCall = getSingleToolCall(readResponse.message.tool_calls)

      if (!readCall) {
        return {
          status: "done",
          outcome: "no_write",
          answer: requireFinalAnswer(readResponse.message.content),
          context,
        }
      }

      if (readCall.function.name !== options.readTool.name) {
        throw new Error(
          `integration:03 expected ${options.readTool.name}, received ${readCall.function.name}`,
        )
      }

      const readResult = await options.readTool.execute(
        readCall.function.arguments,
      )

      const readTrace: ToolTrace = {
        toolCallId: readCall.id,
        toolName: readCall.function.name,
        rawArguments: readCall.function.arguments,
        result: readResult,
      }

      const afterReadMessages: ModelMessage[] = [
        ...context.messages,
        readResponse.message,
        {
          role: "tool",
          tool_call_id: readCall.id,
          content: readResult,
        },
      ]

      // Turn 2: 只给 write_file。模型只能基于刚读到的内容提出修改。
      const writeResponse = await options.llm.chat({
        messages: afterReadMessages,
        tools: [options.writeTool],
      })

      const writeCall = getSingleToolCall(writeResponse.message.tool_calls)

      if (!writeCall) {
        return {
          status: "done",
          outcome: "no_write",
          answer: requireFinalAnswer(writeResponse.message.content),
          context,
          read: readTrace,
        }
      }

      if (writeCall.function.name !== options.writeTool.name) {
        throw new Error(
          `integration:03 expected ${options.writeTool.name}, received ${writeCall.function.name}`,
        )
      }

      const writeTrace: ToolTrace = {
        toolCallId: writeCall.id,
        toolName: writeCall.function.name,
        rawArguments: writeCall.function.arguments,
      }

      const writeMessages: ModelMessage[] = [
        ...afterReadMessages,
        writeResponse.message,
      ]

      // 关键边界：模型只是提出 write_file，真正执行权交给 Permission Runtime。
      const permissionResult = await options.permissionRuntime.start(writeCall)

      if (permissionResult.status === "approval_required") {
        return {
          status: "approval_required",
          request: permissionResult.request,
          pending: {
            request: permissionResult.request,
            messages: writeMessages,
            context,
            read: readTrace,
            write: writeTrace,
          },
        }
      }

      if (permissionResult.status === "blocked") {
        const answer = await finishAfterWrite({
          llm: options.llm,
          messages: writeMessages,
          toolCallId: writeCall.id,
          observation: `write_file blocked by permission: ${permissionResult.reason}`,
        })

        return {
          status: "done",
          outcome: "blocked",
          answer,
          context,
          read: readTrace,
          write: writeTrace,
        }
      }

      writeTrace.result = permissionResult.toolResult

      const answer = await finishAfterWrite({
        llm: options.llm,
        messages: writeMessages,
        toolCallId: writeCall.id,
        observation: permissionResult.toolResult,
      })

      return {
        status: "done",
        outcome: "executed",
        answer,
        context,
        read: readTrace,
        write: writeTrace,
      }
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

      if (permissionResult.status === "executed") {
        pending.write.result = permissionResult.toolResult
      }

      const answer = await finishAfterWrite({
        llm: options.llm,
        messages: pending.messages,
        toolCallId: pending.request.toolCall.id,
        observation,
      })

      return {
        status: "done",
        outcome:
          permissionResult.status === "executed" ? "executed" : "rejected",
        answer,
        context: pending.context,
        read: pending.read,
        write: pending.write,
      }
    },
  }
}
