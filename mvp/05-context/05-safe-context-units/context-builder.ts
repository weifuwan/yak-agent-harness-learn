import {
  flattenUnits,
  groupIntoContextUnits,
  selectRecentUnits,
  type SessionMessage,
} from "./context-unit.js"

export type HistorySelectionPolicy =
  | {
      type: "all_units"
    }
  | {
      type: "recent_units"
      maxUnits: number
    }

export type ContextSources = {
  systemPrompt: string
  currentTask: string
  sessionHistory: SessionMessage[]
  historySelection: HistorySelectionPolicy
}

export type ModelContext = {
  messages: SessionMessage[]
  history: {
    totalMessages: number
    totalUnits: number
    selectedMessages: number
    selectedUnits: number
    policy: string
  }
}

export function buildContext(sources: ContextSources): ModelContext {
  const units = groupIntoContextUnits(sources.sessionHistory)

  const selectedUnits =
    sources.historySelection.type === "all_units"
      ? [...units]
      : selectRecentUnits(units, sources.historySelection.maxUnits)

  const selectedHistory = flattenUnits(selectedUnits)

  return {
    messages: [
      {
        role: "assistant",
        content: `[System]\n${sources.systemPrompt}`,
      },
      ...selectedHistory,
      {
        role: "user",
        content: sources.currentTask,
      },
    ],
    history: {
      totalMessages: sources.sessionHistory.length,
      totalUnits: units.length,
      selectedMessages: selectedHistory.length,
      selectedUnits: selectedUnits.length,
      policy:
        sources.historySelection.type === "all_units"
          ? "all_units"
          : `recent_units:${sources.historySelection.maxUnits}`,
    },
  }
}
