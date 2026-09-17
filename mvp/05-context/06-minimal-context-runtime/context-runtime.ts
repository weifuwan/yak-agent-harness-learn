import type {
  ContextPolicy,
  ModelContext,
  PrepareContextOptions,
  SessionMessage,
} from "./types.js"

type ContextUnit = {
  messages: SessionMessage[]
}

function validateContextUnit(unit: ContextUnit, index: number) {
  if (unit.messages.length === 0) {
    throw new Error(`Context Unit ${index} must not be empty`)
  }

  if (unit.messages[0]?.role !== "user") {
    throw new Error(`Context Unit ${index} must start with a user message`)
  }

  const toolCallIds = new Set<string>()
  const toolResultIds = new Set<string>()

  for (const message of unit.messages) {
    if (message.role === "assistant") {
      for (const toolCall of message.tool_calls ?? []) {
        if (toolCallIds.has(toolCall.id)) {
          throw new Error(
            `Context Unit ${index} contains duplicate tool call id: ${toolCall.id}`,
          )
        }

        toolCallIds.add(toolCall.id)
      }
    }

    if (message.role === "tool") {
      if (!toolCallIds.has(message.tool_call_id)) {
        throw new Error(
          `Context Unit ${index} contains orphan tool result: ${message.tool_call_id}`,
        )
      }

      if (toolResultIds.has(message.tool_call_id)) {
        throw new Error(
          `Context Unit ${index} contains duplicate tool result: ${message.tool_call_id}`,
        )
      }

      toolResultIds.add(message.tool_call_id)
    }
  }

  for (const toolCallId of toolCallIds) {
    if (!toolResultIds.has(toolCallId)) {
      throw new Error(
        `Context Unit ${index} is missing tool result for: ${toolCallId}`,
      )
    }
  }
}

function groupIntoContextUnits(history: SessionMessage[]): ContextUnit[] {
  const units: ContextUnit[] = []
  let current: SessionMessage[] = []

  for (const message of history) {
    if (message.role === "user") {
      if (current.length > 0) {
        units.push({ messages: current })
      }

      current = [message]
      continue
    }

    if (current.length === 0) {
      throw new Error(
        `Session History cannot start with ${message.role}; Context Unit must start with user`,
      )
    }

    current.push(message)
  }

  if (current.length > 0) {
    units.push({ messages: current })
  }

  units.forEach(validateContextUnit)
  return units
}

function selectUnits(units: ContextUnit[], policy: ContextPolicy): ContextUnit[] {
  if (policy.history.type === "all_units") {
    return [...units]
  }

  const maxUnits = policy.history.maxUnits
  if (!Number.isInteger(maxUnits) || maxUnits < 0) {
    throw new Error(
      `policy.history.maxUnits must be a non-negative integer, received: ${maxUnits}`,
    )
  }

  if (maxUnits === 0) {
    return []
  }

  return units.slice(-maxUnits)
}

function flattenUnits(units: ContextUnit[]): SessionMessage[] {
  return units.flatMap((unit) => unit.messages)
}

export function prepareContext(options: PrepareContextOptions): ModelContext {
  const units = groupIntoContextUnits(options.session.messages)
  const selectedUnits = selectUnits(units, options.policy)
  const selectedHistory = flattenUnits(selectedUnits)

  const systemSections = [options.systemPrompt.trim()]
  const projectContext = options.projectContext?.trim()

  if (projectContext) {
    systemSections.push(`[Project Context]\n${projectContext}`)
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
        content: options.currentTask,
      },
    ],
    stats: {
      totalHistoryMessages: options.session.messages.length,
      totalUnits: units.length,
      selectedHistoryMessages: selectedHistory.length,
      selectedUnits: selectedUnits.length,
      hasProjectContext: Boolean(projectContext),
      historyPolicy:
        options.policy.history.type === "all_units"
          ? "all_units"
          : `recent_units:${options.policy.history.maxUnits}`,
    },
  }
}
