import type {
  ModelContext,
  SessionMessage,
} from "../../05-context/06-minimal-context-runtime/types.js"
import {
  estimateContextTokens,
  shouldCompact,
} from "../02-compaction-trigger/compaction-trigger.js"
import {
  groupHistoryIntoUnits,
  splitHotCold,
} from "../03-hot-cold-context/hot-cold.js"
import { summarizeColdUnits } from "../04-summarize-cold-context/summarize-cold.js"
import {
  estimateRebuiltContextTokens,
  rebuildCompactedContext,
  type RebuiltModelContext,
} from "../05-rebuild-compacted-context/rebuild-context.js"

export type CompactionRuntimeOptions = {
  context: ModelContext
  tokenBudget: number
  keepHotUnits: number
  apiKey: string
  baseUrl: string
  model: string
}

export type CompactionResult =
  | {
      compacted: false
      reason: "within_budget"
      context: ModelContext
      beforeTokens: number
      afterTokens: number
      withinBudgetAfter: true
    }
  | {
      compacted: true
      reason: "over_budget"
      context: RebuiltModelContext
      beforeTokens: number
      afterTokens: number
      withinBudgetAfter: boolean
      coldUnits: number
      hotUnits: number
      summary: string
    }

function selectedHistory(context: ModelContext): SessionMessage[] {
  const first = context.messages[0]
  const last = context.messages.at(-1)

  if (!first || first.role !== "system") {
    throw new Error("ModelContext must start with a system message")
  }

  if (!last || last.role !== "user") {
    throw new Error("ModelContext must end with the current user task")
  }

  return context.messages.slice(1, -1) as SessionMessage[]
}

export async function compactIfNeeded(
  options: CompactionRuntimeOptions,
): Promise<CompactionResult> {
  const beforeTokens = estimateContextTokens(options.context)

  if (!shouldCompact(beforeTokens, options.tokenBudget)) {
    return {
      compacted: false,
      reason: "within_budget",
      context: options.context,
      beforeTokens,
      afterTokens: beforeTokens,
      withinBudgetAfter: true,
    }
  }

  const units = groupHistoryIntoUnits(selectedHistory(options.context))
  const { coldUnits, hotUnits } = splitHotCold(
    units,
    options.keepHotUnits,
  )

  if (coldUnits.length === 0) {
    throw new Error(
      "Compaction was triggered, but there are no Cold Units to summarize. Reduce keepHotUnits or change the Context policy.",
    )
  }

  if (!options.apiKey.trim()) {
    throw new Error("apiKey is required when Compaction needs an LLM summary")
  }

  const compactedCold = await summarizeColdUnits({
    coldUnits,
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    model: options.model,
  })

  const rebuiltContext = rebuildCompactedContext({
    originalContext: options.context,
    coldSummary: compactedCold.summary,
    hotUnits,
  })

  const afterTokens = estimateRebuiltContextTokens(rebuiltContext)

  return {
    compacted: true,
    reason: "over_budget",
    context: rebuiltContext,
    beforeTokens,
    afterTokens,
    withinBudgetAfter: afterTokens <= options.tokenBudget,
    coldUnits: coldUnits.length,
    hotUnits: hotUnits.length,
    summary: compactedCold.summary,
  }
}
