export type Message = {
  role: "system" | "user" | "assistant"
  content: string
}

export type Session = {
  messages: Message[]
}

export type ModelContext = {
  messages: Message[]
}

export type BuildContextOptions = {
  systemMessage: Message
  session: Session
  currentPrompt: string
}

export function buildContext(options: BuildContextOptions): ModelContext {
  return {
    messages: [
      options.systemMessage,
      ...options.session.messages,
      {
        role: "user",
        content: options.currentPrompt,
      },
    ],
  }
}
