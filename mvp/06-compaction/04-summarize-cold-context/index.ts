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
} from "../03-hot-cold-context/hot-cold.js"
import {
  estimateTextTokens,
  renderColdUnits,
  summarizeColdUnits,
} from "./summarize-cold.js"

const TOKEN_BUDGET = 2_000
const KEEP_RECENT_UNITS = 10
const KEEP_HOT_UNITS = 3
const REQUIRED_FACT = "IMPORTANT-CONSTRAINT-0401"

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

function createLongSession(unitCount: number): Session {
  const messages: SessionMessage[] = []

  for (let unit = 1; unit <= unitCount; unit += 1) {
    const id = `UNIT-${String(unit).padStart(2, "0")}`
    const importantConstraint =
      unit === 4
        ? `${REQUIRED_FACT}：后续修改不得破坏 NodeNext 模块体系。`
        : ""
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
          importantConstraint,
          detail.repeat(6),
        ]
          .filter(Boolean)
          .join("\n"),
      },
      {
        role: "assistant",
        content: [
          `已记录 FACT-${id}。`,
          importantConstraint
            ? `已确认必须继续保留 ${REQUIRED_FACT}。`
            : "",
          detail.repeat(4),
        ]
          .filter(Boolean)
          .join("\n"),
      },
    )
  }

  return { messages }
}

function selectedHistory(context: ModelContext): SessionMessage[] {
  return context.messages.slice(1, -1) as SessionMessage[]
}

function unitId(unit: ContextUnit): string {
  const first = unit.messages[0]
  if (!first || first.role !== "user") return "UNKNOWN"
  return first.content.match(/UNIT-\d+/)?.[0] ?? "UNKNOWN"
}

function ids(units: ContextUnit[]): string {
  return units.map(unitId).join(", ") || "(none)"
}

const session = createLongSession(12)

const context = prepareContext({
  systemPrompt: "你是一个严格基于当前 Context 工作的 Agent。",
  currentTask:
    "继续当前任务。已经选中的历史都仍然需要，但较旧部分允许压缩为更短表示。",
  session,
  projectContext: [
    "project: yak-agent-harness-learn",
    "stage: compaction:04",
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

if (!compact) {
  throw new Error(
    "Demo expected shouldCompact=true. Increase demo context size or lower TOKEN_BUDGET.",
  )
}

const units = groupHistoryIntoUnits(selectedHistory(context))
const { coldUnits, hotUnits } = splitHotCold(units, KEEP_HOT_UNITS)
const coldSourceText = renderColdUnits(coldUnits)
const coldBeforeTokens = estimateTextTokens(coldSourceText)

console.log("========== Compaction 04 · Summarize Cold Context ==========")
console.log("这一节第一次真正压缩内容：只压 Cold Units，Hot Units 完全不改。")
console.log("")
console.log(`model             : ${model}`)
console.log(`selected units    : ${units.length}`)
console.log(`cold units        : ${coldUnits.length} → ${ids(coldUnits)}`)
console.log(`hot units         : ${hotUnits.length} → ${ids(hotUnits)}`)
console.log(`cold tokens before: ${coldBeforeTokens}`)
console.log(`required fact     : ${REQUIRED_FACT}`)

const compactedCold = await summarizeColdUnits({
  coldUnits,
  apiKey,
  baseUrl,
  model,
})

const summaryTokens = estimateTextTokens(compactedCold.summary)
const reduction = coldBeforeTokens - summaryTokens
const retainedPercent =
  coldBeforeTokens === 0
    ? 100
    : Math.round((summaryTokens / coldBeforeTokens) * 100)
const keyFactPreserved = compactedCold.summary.includes(REQUIRED_FACT)

console.log("\n========== Compacted Cold Summary ==========")
console.log(compactedCold.summary)
console.log("\n========== Comparison ==========")
console.log(`cold source units : ${compactedCold.sourceUnits}`)
console.log(`cold source msgs  : ${compactedCold.sourceMessages}`)
console.log(`before tokens     : ${coldBeforeTokens}`)
console.log(`summary tokens    : ${summaryTokens}`)
console.log(`token reduction   : ${reduction > 0 ? `-${reduction}` : reduction}`)
console.log(`summary size      : ${retainedPercent}% of cold source`)
console.log(`key fact preserved: ${keyFactPreserved}`)
console.log(`hot units changed : false (${ids(hotUnits)})`)

console.log("\n========== 关键观察 ==========")
console.log("compaction:03 只把 Selected Context 分成 Cold / Hot。")
console.log("compaction:04 第一次真正改变信息表示：Cold 原文 → 更短 Summary。")
console.log("Hot Units 仍然保持完整原文，这一节不对它们做任何修改。")
console.log("Compaction 不只是追求更短，还要检查关键事实是否仍然存在。")
console.log(
  keyFactPreserved
    ? `${REQUIRED_FACT} 仍然存在：这次压缩至少保住了演示中的关键约束。`
    : `${REQUIRED_FACT} 丢失：虽然变短了，但这次语义压缩失败。`,
)
console.log("当前还没有把 Summary + Hot Units 重建成新的 ModelContext。")
console.log("下一节 compaction:05 才解决：压完以后怎么重新组装真正给 LLM 的 Context？")
