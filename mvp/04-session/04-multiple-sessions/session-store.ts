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
  id: string
  messages: SessionMessage[]
}

export type SessionStore = Map<string, Session>

export function createSessionStore(): SessionStore {
  return new Map<string, Session>()
}

export function getOrCreateSession(
  store: SessionStore,
  sessionId: string,
): Session {
  const id = sessionId.trim()

  if (!id) {
    throw new Error("sessionId must be a non-empty string")
  }

  const existing = store.get(id)
  if (existing) {
    return existing
  }

  const session: Session = {
    id,
    messages: [],
  }

  store.set(id, session)
  return session
}
