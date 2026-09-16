export type MessageRole = "user" | "assistant"

export interface Message {
  readonly role: MessageRole
  readonly content: string
}

export interface LLMRequest {
  readonly system?: string
  readonly messages: readonly Message[]
  readonly signal?: AbortSignal
}

export interface Usage {
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly totalTokens?: number
}

export type LLMEvent =
  | { readonly type: "start"; readonly provider: string; readonly model: string }
  | { readonly type: "text-delta"; readonly text: string }
  | { readonly type: "finish"; readonly reason: string; readonly usage?: Usage }
  | { readonly type: "error"; readonly message: string; readonly aborted: boolean }

export type ProviderEvent =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "finish"; readonly reason: string; readonly usage?: Usage }

export interface Provider {
  readonly name: string
  readonly model: string
  stream(request: LLMRequest): AsyncIterable<ProviderEvent>
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && /abort/i.test(`${error.name} ${error.message}`))
  )
}
