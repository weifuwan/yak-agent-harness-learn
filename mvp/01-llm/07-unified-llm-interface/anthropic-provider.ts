import type { LLMRequest, LLMResponse, Provider } from "./types.js"

type AnthropicProviderOptions = {
  apiKey: string
  baseUrl: string
  model: string
}

export class AnthropicProvider implements Provider {
  readonly name = "Anthropic"
  readonly model: string

  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(options: AnthropicProviderOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl.replace(/\/+$/, "")
    this.model = options.model
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 512,
        ...(request.system ? { system: request.system } : {}),
        messages: request.messages,
        stream: false,
      }),
    })

    const rawBody = await response.text()
    if (!response.ok) {
      throw new Error(`Anthropic HTTP ${response.status}: ${rawBody}`)
    }

    const payload = JSON.parse(rawBody) as {
      content?: Array<{
        type?: string
        text?: string
      }>
      usage?: {
        input_tokens?: number
        output_tokens?: number
      }
    }

    const content = (payload.content ?? [])
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("")
      .trim()

    if (!content) throw new Error("Anthropic returned no assistant text")

    const inputTokens = payload.usage?.input_tokens
    const outputTokens = payload.usage?.output_tokens

    return {
      content,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens:
          inputTokens !== undefined && outputTokens !== undefined
            ? inputTokens + outputTokens
            : undefined,
      },
    }
  }
}
