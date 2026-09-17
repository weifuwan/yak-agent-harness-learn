import type { SessionMessage } from "../../05-context/06-minimal-context-runtime/types.js"

export type ContextUnit = {
  messages: SessionMessage[]
}

export type HotColdPartition = {
  coldUnits: ContextUnit[]
  hotUnits: ContextUnit[]
}

export function groupHistoryIntoUnits(
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
        `Selected history cannot start with ${message.role}; expected a complete Context Unit`,
      )
    }

    current.push(message)
  }

  if (current.length > 0) {
    units.push({ messages: current })
  }

  return units
}

export function splitHotCold(
  units: ContextUnit[],
  keepHotUnits: number,
): HotColdPartition {
  if (!Number.isInteger(keepHotUnits) || keepHotUnits < 0) {
    throw new Error(
      `keepHotUnits must be a non-negative integer, received: ${keepHotUnits}`,
    )
  }

  const splitAt = Math.max(0, units.length - keepHotUnits)

  return {
    coldUnits: units.slice(0, splitAt),
    hotUnits: units.slice(splitAt),
  }
}
