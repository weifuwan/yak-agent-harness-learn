import type {
  ModelContext,
  ModelMessage,
  SessionMessage,
} from "../../05-context/06-minimal-context-runtime/types.js"
import type { ContextUnit } from "../03-hot-cold-context/hot-cold.js"

export type RebuiltModelContext = {
  messages: ModelMessage[]
  stats: {
    originalContextMessages: number
    rebuiltContextMessages: number
    hotUnits: number
    hotMessages: number
    hasCompactedColdSummary: boolean
  }
}

function flattenUnits(units: ContextUnit[]): SessionMessage[] {
  return units.flatMap((unit) => unit.messages)
}

export function rebuildCompactedContext(options: {
  originalContext: ModelContext
  coldSummary: string
  hotUnits: ContextUnit[]
}): RebuiltModelContext {
  const first = options.originalContext.messages[0]
  const last = options.originalContext.messages.at(-1)

  if (!first || first.role !== "system") {
    throw new Error("Original ModelContext must start with a system message")
  }

  if (!last || last.role !== "user") {
    throw new Error("Original ModelContext must end with the current user task")
  }

  const coldSummary = options.coldSummary.trim()
  if (!coldSummary) {
    throw new Error("coldSummary must not be empty")
  }

  const hotHistory = flattenUnits(options.hotUnits)

  const rebuiltSystemMessage: ModelMessage = {
    role: "system",
    content: [
      first.content,
      `[Compacted Cold History]\n${coldSummary}`,
    ].join("\n\n"),
  }

  const messages: ModelMessage[] = [
    rebuiltSystemMessage,
    ...hotHistory,
    last,
  ]

  return {
    messages,
    stats: {
      originalContextMessages: options.originalContext.messages.length,
      rebuiltContextMessages: messages.length,
      hotUnits: options.hotUnits.length,
      hotMessages: hotHistory.length,
      hasCompactedColdSummary: true,
    },
  }
}

function messageText(message: ModelMessage): string {
  if (message.role === "assistant") {
    const toolCalls = message.tool_calls
      ? JSON.stringify(message.tool_calls)
      : ""
    return `${message.content ?? ""}${toolCalls}`
  }

  if (message.role === "tool") {
    return `${message.tool_call_id}${message.content}`
  }

  return message.content
}

export function estimateRebuiltContextTokens(
  context: RebuiltModelContext,
): number {
  const characters = context.messages.reduce(
    (sum, message) => sum + messageText(message).length,
    0,
  )

  return Math.ceil(characters / 4)
}
