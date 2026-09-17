import { readFileTool } from "../../mvp/02-tool/07-unified-tool-interface/tools.js"
import type {
  ModelContext,
  Session,
  ToolCall,
} from "../../mvp/05-context/06-minimal-context-runtime/types.js"
import { prepareContext } from "../../mvp/05-context/06-minimal-context-runtime/context-runtime.js"
import type { ToolCapableProvider } from "./tool-capable-provider.js"

export type ReadOnlyCodingAgentOptions = {
  llm: ToolCapableProvider
  systemPrompt: string
  projectContext?: string
  historyMaxUnits?: number
}

export type ReadOnlyCodingAgentRunInput = {
  prompt: string
  session?: Session
}

export type ReadTrace = {
  toolCallId: string
  toolName: "read_file"
  rawArguments: string
  result: string
}

export type ReadOnlyCodingAgentRunResult = {
  answer: string
  context: ModelContext
  modelTurns: 1 | 2
  read?: ReadTrace
}

export type ReadOnlyCodingAgent = {
  run(input: ReadOnlyCodingAgentRunInput): Promise<ReadOnlyCodingAgentRunResult>
}

function getSingleToolCall(toolCalls: ToolCall[] | undefined): ToolCall | undefined {
  if (!toolCalls || toolCalls.length === 0) {
    return undefined
  }

  if (toolCalls.length > 1) {
    throw new Error(
      `integration:02 intentionally supports at most one tool call, received ${toolCalls.length}`,
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

export function createReadOnlyCodingAgent(
  options: ReadOnlyCodingAgentOptions,
): ReadOnlyCodingAgent {
  const historyMaxUnits = options.historyMaxUnits ?? 6

  return {
    async run(input) {
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

      const firstResponse = await options.llm.chat({
        messages: context.messages,
        tools: [readFileTool],
      })

      const toolCall = getSingleToolCall(firstResponse.message.tool_calls)

      if (!toolCall) {
        return {
          answer: requireFinalAnswer(firstResponse.message.content),
          context,
          modelTurns: 1,
        }
      }

      if (toolCall.function.name !== readFileTool.name) {
        throw new Error(
          `integration:02 only allows read_file, received: ${toolCall.function.name}`,
        )
      }

      const toolResult = await readFileTool.execute(toolCall.function.arguments)

      const secondResponse = await options.llm.chat({
        messages: [
          ...context.messages,
          firstResponse.message,
          {
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult,
          },
        ],
        // 这一轮只学“一次读取后回答”，不提前进入 Multi-Step Loop。
        tools: [],
      })

      if (secondResponse.message.tool_calls?.length) {
        throw new Error(
          "integration:02 supports exactly one read_file round; additional tool calls belong to integration:04",
        )
      }

      return {
        answer: requireFinalAnswer(secondResponse.message.content),
        context,
        modelTurns: 2,
        read: {
          toolCallId: toolCall.id,
          toolName: "read_file",
          rawArguments: toolCall.function.arguments,
          result: toolResult,
        },
      }
    },
  }
}
