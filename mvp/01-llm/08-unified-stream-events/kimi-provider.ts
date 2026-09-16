import type { LLMEvent, LLMRequest, Provider } from "./types.js"

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

  async *stream(request: LLMRequest): AsyncIterable<LLMEvent> {
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
        stream: true,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Kimi HTTP ${response.status}: ${body}`)
    }

    if (!response.body) {
      throw new Error("Kimi streaming response has no body")
    }

    yield {
      type: "start",
      provider: this.name,
      model: this.model,
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let finished = false

    while (!finished) {
      const result = await reader.read()
      buffer += decoder.decode(result.value ?? new Uint8Array(), {
        stream: !result.done,
      })

      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("data:")) continue

        const data = trimmed.slice(5).trim()
        if (!data) continue

        if (data === "[DONE]") {
          finished = true
          yield { type: "finish" }
          break
        }

        const payload = JSON.parse(data) as {
          choices?: Array<{
            delta?: {
              content?: string | null
            }
          }>
        }

        const text = payload.choices?.[0]?.delta?.content
        if (text) {
          yield {
            type: "text-delta",
            text,
          }
        }
      }

      if (result.done) break
    }

    if (!finished) {
      throw new Error("Kimi stream ended before data: [DONE]")
    }
  }
}
