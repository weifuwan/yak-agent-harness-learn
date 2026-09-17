import { prepareContext } from "../../05-context/06-minimal-context-runtime/context-runtime.js"
import type {
  ModelContext,
  Session,
  SessionMessage,
} from "../../05-context/06-minimal-context-runtime/types.js"
import {
  estimateContextTokens,
  shouldCompact,
} from "../02-compaction-trigger/compaction-trigger.js"
import {
  groupHistoryIntoUnits,
  splitHotCold,
  type ContextUnit,
} from "./hot-cold.js"

const TOKEN_BUDGET = 2_000
const KEEP_RECENT_UNITS = 10
const KEEP_HOT_UNITS = 3

function createLongSession(unitCount: number): Session {
  const messages: SessionMessage[] = []

  for (let unit = 1; unit <= unitCount; unit += 1) {
    const id = `UNIT-${String(unit).padStart(2, "0")}`
    const detail = [
      `这是 ${id} 的执行背景。`,
      "其中包含当前任务后续仍可能依赖的约束、决定、工具观察和中间结论。",
      "这些内容已经经过 Context Selection，暂时都被认为需要保留。",
    ].join("")

    messages.push(
      {
        role: "user",
        content: [
          `历史任务 ${id}。`,
          `关键事实 FACT-${id}。`,
          detail.repeat(6),
        ].join("\n"),
      },
      {
        role: "assistant",
        content: [
          `已记录 FACT-${id}。`,
          detail.repeat(4),
        ].join("\n"),
      },
    )
  }

  return { messages }
}

function unitId(unit: ContextUnit): string {
  const first = unit.messages[0]
  if (!first || first.role !== "user") return "UNKNOWN"

  return first.content.match(/UNIT-\d+/)?.[0] ?? "UNKNOWN"
}

function ids(units: ContextUnit[]): string {
  return units.map(unitId).join(", ") || "(none)"
}

function selectedHistory(context: ModelContext): SessionMessage[] {
  // prepareContext() 的结构固定为：system + selected history + current task。
  return context.messages.slice(1, -1) as SessionMessage[]
}

const session = createLongSession(14)

const context = prepareContext({
  systemPrompt: "你是一个严格基于当前 Context 工作的 Agent。",
  currentTask:
    "继续当前任务。当前选中的历史都仍有价值，但最近几轮最可能被下一步直接使用。",
  session,
  projectContext: [
    "project: yak-agent-harness-learn",
    "stage: compaction:03",
  ].join("\n"),
  policy: {
    history: {
      type: "recent_units",
      maxUnits: KEEP_RECENT_UNITS,
    },
  },
})

const estimatedTokens = estimateContextTokens(context)
const compact = shouldCompact(estimatedTokens, TOKEN_BUDGET)

console.log("========== Compaction 03 · Hot / Cold Context ==========")
console.log("这一节只负责决定：哪些 Unit 准备压缩，哪些 Unit 保持原样。")
console.log("")
console.log(`selected units    : ${context.stats.selectedUnits}`)
console.log(`estimated tokens  : ${estimatedTokens}`)
console.log(`token budget      : ${TOKEN_BUDGET}`)
console.log(`shouldCompact     : ${compact}`)

if (!compact) {
  throw new Error(
    "Demo expected shouldCompact=true. Increase demo context size or lower TOKEN_BUDGET.",
  )
}

const units = groupHistoryIntoUnits(selectedHistory(context))
const { coldUnits, hotUnits } = splitHotCold(units, KEEP_HOT_UNITS)

console.log("\n========== Partition ==========")
console.log(`all selected units: ${units.length} → ${ids(units)}`)
console.log(`cold units        : ${coldUnits.length} → ${ids(coldUnits)}`)
console.log(`hot units         : ${hotUnits.length} → ${ids(hotUnits)}`)
console.log(`keep hot units    : ${KEEP_HOT_UNITS}`)

console.log("\n========== 关键观察 ==========")
console.log("compaction:02 只决定要不要进入 Compaction。")
console.log("compaction:03 再决定：已经选中的 Context Units 里，哪些准备压、哪些保持原样。")
console.log("Cold Units = 较旧但仍需要，下一节才考虑压缩。")
console.log("Hot Units = 最近正在工作的历史，这一节明确保持原样。")
console.log("当前没有删除任何 Unit，也没有生成 Summary，更没有重建最终 Context。")
console.log("02 = Trigger；03 = Partition。")
console.log("下一节 compaction:04 才第一次真正压缩 Cold Units。")
