export type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

export type LLMRequest = {
  system?: string
  messages: ChatMessage[]
}

export type LLMEvent =
  | {
      type: "start"
      provider: string
      model: string
    }
  | {
      type: "text-delta"
      text: string
    }
  | {
      type: "finish"
    }

export interface Provider {
  readonly name: string
  readonly model: string

  stream(request: LLMRequest): AsyncIterable<LLMEvent>
}
