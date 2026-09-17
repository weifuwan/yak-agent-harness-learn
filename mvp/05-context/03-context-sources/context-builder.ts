export type Message = {
  role: "system" | "user" | "assistant"
  content: string
}

export type Session = {
  messages: Message[]
}

export type ContextSources = {
  systemPrompt: string
  currentTask: string
  sessionHistory: Message[]
  projectContext?: string
}

export type ModelContext = {
  messages: Message[]
  sources: {
    hasSystemPrompt: boolean
    historyMessages: number
    hasProjectContext: boolean
    hasCurrentTask: boolean
  }
}

export function buildContext(sources: ContextSources): ModelContext {
  const systemSections = [sources.systemPrompt]

  if (sources.projectContext?.trim()) {
    systemSections.push(`[Project Context]\n${sources.projectContext.trim()}`)
  }

  return {
    messages: [
      {
        role: "system",
        content: systemSections.join("\n\n"),
      },
      ...sources.sessionHistory,
      {
        role: "user",
        content: sources.currentTask,
      },
    ],
    sources: {
      hasSystemPrompt: true,
      historyMessages: sources.sessionHistory.length,
      hasProjectContext: Boolean(sources.projectContext?.trim()),
      hasCurrentTask: true,
    },
  }
}
