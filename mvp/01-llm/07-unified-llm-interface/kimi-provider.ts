import type { LLMRequest, LLMResponse, Provider } from "./types.js"

type KimiProviderOptions = {
  apiKey: string
  baseUrl: string
  model: string
}

export class KimiProvider implements Provider {
  readonly name = "Kimi"
  readonly model: string

  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(options: KimiProviderOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl.replace(/\/+$/, "")
    this.model = options.model
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const messages = [
      ...(request.system
        ? [{ role: "system" as const, content: request.system }]
        : []),
      ...request.messages,
    ]

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
      }),
    })

    const rawBody = await response.text()
    if (!response.ok) {
      throw new Error(`Kimi HTTP ${response.status}: ${rawBody}`)
    }

    const payload = JSON.parse(rawBody) as {
      choices?: Array<{
        message?: {
          content?: string | null
        }
      }>
      usage?: {
        prompt_tokens?: number
        completion_tokens?: number
        total_tokens?: number
      }
    }

    const content = payload.choices?.[0]?.message?.content?.trim()
    if (!content) throw new Error("Kimi returned no assistant text")

    return {
      content,
      usage: {
        inputTokens: payload.usage?.prompt_tokens,
        outputTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
      },
    }
  }
}
