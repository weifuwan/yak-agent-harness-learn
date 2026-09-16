export type SessionMessage =
  | {
      role: "user"
      content: string
    }
  | {
      role: "assistant"
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
