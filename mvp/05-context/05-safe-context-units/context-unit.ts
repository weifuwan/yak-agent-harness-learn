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

export type ContextUnit = {
  messages: SessionMessage[]
}

function validateUnit(unit: ContextUnit, index: number) {
  if (unit.messages.length === 0) {
    throw new Error(`Context Unit ${index} must not be empty`)
  }

  if (unit.messages[0]?.role !== "user") {
    throw new Error(`Context Unit ${index} must start with a user message`)
  }

  const toolCallIds = new Set<string>()

  for (const message of unit.messages) {
    if (message.role === "assistant") {
      for (const toolCall of message.tool_calls ?? []) {
        toolCallIds.add(toolCall.id)
      }
    }

    if (message.role === "tool" && !toolCallIds.has(message.tool_call_id)) {
      throw new Error(
        `Context Unit ${index} contains orphan tool result: ${message.tool_call_id}`,
      )
    }
  }
}

export function groupIntoContextUnits(
  history: SessionMessage[],
): ContextUnit[] {
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
        `History cannot start with ${message.role}; a Context Unit must start with user`,
      )
    }

    current.push(message)
  }

  if (current.length > 0) {
    units.push({ messages: current })
  }

  units.forEach(validateUnit)
  return units
}

export function selectRecentUnits(
  units: ContextUnit[],
  maxUnits: number,
): ContextUnit[] {
  if (!Number.isInteger(maxUnits) || maxUnits < 0) {
    throw new Error(
      `maxUnits must be a non-negative integer, received: ${maxUnits}`,
    )
  }

  if (maxUnits === 0) {
    return []
  }

  return units.slice(-maxUnits)
}

export function flattenUnits(units: ContextUnit[]): SessionMessage[] {
  return units.flatMap((unit) => unit.messages)
}
