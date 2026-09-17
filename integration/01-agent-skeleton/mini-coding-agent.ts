import type {
  ModelContext,
  Session,
} from "../../mvp/05-context/06-minimal-context-runtime/types.js"
import { prepareContext } from "../../mvp/05-context/06-minimal-context-runtime/context-runtime.js"
import type {
  LLMRequest,
  LLMResponse,
  Provider,
} from "../../mvp/01-llm/07-unified-llm-interface/types.js"

export type MiniCodingAgentOptions = {
  llm: Provider
  systemPrompt: string
  projectContext?: string
  historyMaxUnits?: number
}

export type MiniCodingAgentRunInput = {
  prompt: string
  session?: Session
}

export type MiniCodingAgentRunResult = {
  answer: string
  context: ModelContext
  usage: LLMResponse["usage"]
}

export type MiniCodingAgent = {
  run(input: MiniCodingAgentRunInput): Promise<MiniCodingAgentRunResult>
}

function toLLMRequest(context: ModelContext): LLMRequest {
  const [first, ...rest] = context.messages

  if (!first || first.role !== "system") {
    throw new Error("ModelContext must start with a system message")
  }

  const messages: LLMRequest["messages"] = rest.map((message) => {
    if (message.role === "system") {
      throw new Error(
        "integration:01 expects exactly one leading system message",
      )
    }

    if (message.role === "tool") {
      throw new Error(
        "integration:01 does not support tool messages yet; Tool Integration comes later",
      )
    }

    if (message.role === "assistant" && message.tool_calls?.length) {
      throw new Error(
        "integration:01 does not support assistant tool calls yet; Tool Integration comes later",
      )
    }

    return {
      role: message.role,
      content: message.content ?? "",
    }
  })

  return {
    system: first.content,
    messages,
  }
}

export function createMiniCodingAgent(
  options: MiniCodingAgentOptions,
): MiniCodingAgent {
  const historyMaxUnits = options.historyMaxUnits ?? 6

  return {
    async run(input) {
      const prompt = input.prompt.trim()
      if (!prompt) {
        throw new Error("prompt must not be empty")
      }

      const session = input.session ?? { messages: [] }

      const context = prepareContext({
        systemPrompt: options.systemPrompt,
        currentTask: prompt,
        session,
        projectContext: options.projectContext,
        policy: {
          history: {
            type: "recent_units",
            maxUnits: historyMaxUnits,
          },
        },
      })

      const request = toLLMRequest(context)
      const response = await options.llm.chat(request)

      return {
        answer: response.content,
        context,
        usage: response.usage,
      }
    },
  }
}
