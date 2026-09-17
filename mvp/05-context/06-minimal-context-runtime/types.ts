export type ToolCall = {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string
  }
}

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

export type HistoryPolicy =
  | {
      type: "all_units"
    }
  | {
      type: "recent_units"
      maxUnits: number
    }

export type ContextPolicy = {
  history: HistoryPolicy
}

export type PrepareContextOptions = {
  systemPrompt: string
  currentTask: string
  session: Session
  projectContext?: string
  policy: ContextPolicy
}

export type ModelMessage =
  | {
      role: "system"
      content: string
    }
  | SessionMessage

export type ModelContext = {
  messages: ModelMessage[]
  stats: {
    totalHistoryMessages: number
    totalUnits: number
    selectedHistoryMessages: number
    selectedUnits: number
    hasProjectContext: boolean
    historyPolicy: string
  }
}
