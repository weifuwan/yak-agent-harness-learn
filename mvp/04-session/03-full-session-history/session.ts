import type { ToolCall } from "../../02-tool/07-unified-tool-interface/types.js"

export type SessionMessage =
  | {
      role: "user"
      content: string
    }
  | {
      role: "assistant"
      content: string | null
      tool_calls?: ToolCall[]
    }
  | {
      role: "tool"
      tool_call_id: string
      content: string
    }

export type Session = {
  messages: SessionMessage[]
}

export function createSession(): Session {
  return {
    messages: [],
  }
}
