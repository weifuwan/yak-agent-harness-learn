import type { LLMEvent, LLMRequest, Provider } from "./types.js"
import { errorMessage, isAbortError } from "./types.js"

export class LLM {
  constructor(private readonly provider: Provider) {}

  async *stream(request: LLMRequest): AsyncIterable<LLMEvent> {
    yield {
      type: "start",
      provider: this.provider.name,
      model: this.provider.model,
    }

    try {
      for await (const event of this.provider.stream(request)) {
        if (event.type === "text") {
          yield { type: "text-delta", text: event.text }
          continue
        }

        yield {
          type: "finish",
          reason: event.reason,
          ...(event.usage ? { usage: event.usage } : {}),
        }
      }
    } catch (error) {
      yield {
        type: "error",
        message: errorMessage(error),
        aborted: isAbortError(error),
      }
    }
  }
}
