import type { LLMRequest, Provider, ProviderEvent, Usage } from "./types.js"

export interface DeepSeekProviderConfig {
  readonly apiKey: string
  readonly baseUrl: string
  readonly model: string
}

interface DeepSeekChunk {
  readonly choices?: ReadonlyArray<{
    readonly delta?: { readonly content?: string | null }
    readonly finish_reason?: string | null
  }>
  readonly usage?: {
    readonly prompt_tokens?: number
    readonly completion_tokens?: number
    readonly total_tokens?: number
  } | null
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "")
}

function toUsage(value: DeepSeekChunk["usage"]): Usage | undefined {
  if (!value) return undefined
  return {
    ...(value.prompt_tokens === undefined ? {} : { inputTokens: value.prompt_tokens }),
    ...(value.completion_tokens === undefined ? {} : { outputTokens: value.completion_tokens }),
    ...(value.total_tokens === undefined ? {} : { totalTokens: value.total_tokens }),
  }
}

async function* readSseData(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      while (true) {
        const newline = buffer.indexOf("\n")
        if (newline === -1) break
        const line = buffer.slice(0, newline).replace(/\r$/, "")
        buffer = buffer.slice(newline + 1)
        if (line.startsWith("data:")) yield line.slice(5).trimStart()
      }
    }

    buffer += decoder.decode()
    const tail = buffer.trim()
    if (tail.startsWith("data:")) yield tail.slice(5).trimStart()
  } finally {
    reader.releaseLock()
  }
}

export class DeepSeekProvider implements Provider {
  readonly name = "deepseek"
  readonly model: string

  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(config: DeepSeekProviderConfig) {
    this.apiKey = config.apiKey.trim()
    this.baseUrl = normalizeBaseUrl(config.baseUrl.trim())
    this.model = config.model.trim()

    if (!this.apiKey) throw new Error("MODEL_API_KEY is required")
    if (!this.baseUrl) throw new Error("MODEL_BASE_URL is required")
    if (!this.model) throw new Error("MODEL_NAME is required")
  }

  async *stream(request: LLMRequest): AsyncIterable<ProviderEvent> {
    const messages = [
      ...(request.system ? [{ role: "system" as const, content: request.system }] : []),
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
        stream_options: { include_usage: true },
      }),
      signal: request.signal,
    })

    if (!response.ok) {
      const detail = (await response.text()).trim().slice(0, 500)
      throw new Error(`DeepSeek HTTP ${response.status}${detail ? `: ${detail}` : ""}`)
    }
    if (!response.body) throw new Error("DeepSeek returned an empty response body")

    let finishReason = "stop"
    let usage: Usage | undefined
    let sawDone = false

    for await (const data of readSseData(response.body)) {
      if (!data) continue
      if (data === "[DONE]") {
        sawDone = true
        break
      }

      let chunk: DeepSeekChunk
      try {
        chunk = JSON.parse(data) as DeepSeekChunk
      } catch {
        throw new Error(`Invalid DeepSeek SSE chunk: ${data.slice(0, 160)}`)
      }

      const latestUsage = toUsage(chunk.usage)
      if (latestUsage) usage = latestUsage

      const choice = chunk.choices?.[0]
      const text = choice?.delta?.content
      if (text) yield { type: "text", text }
      if (choice?.finish_reason) finishReason = choice.finish_reason
    }

    if (!sawDone) throw new Error("DeepSeek stream ended before data: [DONE]")
    yield { type: "finish", reason: finishReason, ...(usage ? { usage } : {}) }
  }
}
