export type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

export type LLMRequest = {
  system?: string
  messages: ChatMessage[]
}

export type LLMUsage = {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

export type LLMResponse = {
  content: string
  usage: LLMUsage
}

export interface Provider {
  readonly name: string
  readonly model: string

  chat(request: LLMRequest): Promise<LLMResponse>
}
