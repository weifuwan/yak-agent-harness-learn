import type { LLMEvent, LLMRequest, Provider } from "./types.js"

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

  async *stream(request: LLMRequest): AsyncIterable<LLMEvent> {
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
        stream: true,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Anthropic HTTP ${response.status}: ${body}`)
    }

    if (!response.body) {
      throw new Error("Anthropic streaming response has no body")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let started = false
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

        const payload = JSON.parse(data) as {
          type?: string
          delta?: {
            type?: string
            text?: string
          }
        }

        if (payload.type === "message_start" && !started) {
          started = true
          yield {
            type: "start",
            provider: this.name,
            model: this.model,
          }
          continue
        }

        if (
          payload.type === "content_block_delta" &&
          payload.delta?.type === "text_delta" &&
          payload.delta.text
        ) {
          yield {
            type: "text-delta",
            text: payload.delta.text,
          }
          continue
        }

        if (payload.type === "message_stop") {
          finished = true
          yield { type: "finish" }
          break
        }
      }

      if (result.done) break
    }

    if (!started) {
      throw new Error("Anthropic stream ended before message_start")
    }

    if (!finished) {
      throw new Error("Anthropic stream ended before message_stop")
    }
  }
}
