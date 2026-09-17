export type Message = {
  role: "system" | "user" | "assistant"
  content: string
}

export type HistorySelectionPolicy =
  | {
      type: "all"
    }
  | {
      type: "recent"
      maxMessages: number
    }

export type ContextSources = {
  systemPrompt: string
  currentTask: string
  sessionHistory: Message[]
  projectContext?: string
  historySelection: HistorySelectionPolicy
}

export type ModelContext = {
  messages: Message[]
  history: {
    totalMessages: number
    selectedMessages: number
    policy: string
  }
}

function selectHistory(
  history: Message[],
  policy: HistorySelectionPolicy,
): Message[] {
  if (policy.type === "all") {
    return [...history]
  }

  if (!Number.isInteger(policy.maxMessages) || policy.maxMessages < 0) {
    throw new Error(
      `historySelection.maxMessages must be a non-negative integer, received: ${policy.maxMessages}`,
    )
  }

  if (policy.maxMessages === 0) {
    return []
  }

  // 当前故意使用最简单的“最近 N 条消息”。
  // 它只解决“选多少”，还不知道 Tool Call / Tool Result 是否应该成组保留。
  return history.slice(-policy.maxMessages)
}

export function buildContext(sources: ContextSources): ModelContext {
  const selectedHistory = selectHistory(
    sources.sessionHistory,
    sources.historySelection,
  )

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
      ...selectedHistory,
      {
        role: "user",
        content: sources.currentTask,
      },
    ],
    history: {
      totalMessages: sources.sessionHistory.length,
      selectedMessages: selectedHistory.length,
      policy:
        sources.historySelection.type === "all"
          ? "all"
          : `recent:${sources.historySelection.maxMessages}`,
    },
  }
}
