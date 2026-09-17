import type { Tool } from "../../mvp/02-tool/07-unified-tool-interface/types.js"
import type {
  ModelMessage,
  ToolCall,
} from "../../mvp/05-context/06-minimal-context-runtime/types.js"

export type ToolCapableRequest = {
  messages: ModelMessage[]
  tools: Tool[]
}

export type ToolCapableResponse = {
  message: {
    role: "assistant"
    content: string | null
    tool_calls?: ToolCall[]
  }
  usage: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
}

export interface ToolCapableProvider {
  readonly name: string
  readonly model: string

  chat(request: ToolCapableRequest): Promise<ToolCapableResponse>
}

type DeepSeekToolProviderOptions = {
  apiKey: string
  baseUrl: string
  model: string
}

export class DeepSeekToolProvider implements ToolCapableProvider {
  readonly name = "DeepSeek"
  readonly model: string

  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(options: DeepSeekToolProviderOptions) {
    if (!options.apiKey.trim()) {
      throw new Error("DeepSeek apiKey must not be empty")
    }

    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl.replace(/\/+$/, "")
    this.model = options.model
  }

  async chat(request: ToolCapableRequest): Promise<ToolCapableResponse> {
    const toolSchemas = request.tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))

    const body: Record<string, unknown> = {
      model: this.model,
      messages: request.messages,
      stream: false,
    }

    if (toolSchemas.length > 0) {
      body.tools = toolSchemas
      body.tool_choice = "auto"
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const rawBody = await response.text()
    if (!response.ok) {
      throw new Error(`DeepSeek HTTP ${response.status}: ${rawBody}`)
    }

    const payload = JSON.parse(rawBody) as {
      choices?: Array<{
        message?: {
          content?: string | null
          tool_calls?: Array<{
            id?: string
            type?: string
            function?: {
              name?: string
              arguments?: string
            }
          }>
        }
      }>
      usage?: {
        prompt_tokens?: number
        completion_tokens?: number
        total_tokens?: number
      }
    }

    const rawMessage = payload.choices?.[0]?.message
    if (!rawMessage) {
      throw new Error("DeepSeek returned no choices[0].message")
    }

    const toolCalls: ToolCall[] = (rawMessage.tool_calls ?? []).map(
      (toolCall, index) => {
        const id = toolCall.id
        const name = toolCall.function?.name
        const rawArguments = toolCall.function?.arguments

        if (!id) {
          throw new Error(`Tool call ${index} has no id`)
        }

        if (toolCall.type !== "function") {
          throw new Error(`Tool call ${id} is not a function call`)
        }

        if (!name) {
          throw new Error(`Tool call ${id} has no function name`)
        }

        if (rawArguments === undefined) {
          throw new Error(`Tool call ${id} has no arguments`)
        }

        return {
          id,
          type: "function",
          function: {
            name,
            arguments: rawArguments,
          },
        }
      },
    )

    const content =
      typeof rawMessage.content === "string" ? rawMessage.content : null

    if (toolCalls.length === 0 && !content?.trim()) {
      throw new Error(
        "DeepSeek returned neither tool calls nor final assistant content",
      )
    }

    return {
      message: {
        role: "assistant",
        content,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      },
      usage: {
        inputTokens: payload.usage?.prompt_tokens,
        outputTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
      },
    }
  }
}
