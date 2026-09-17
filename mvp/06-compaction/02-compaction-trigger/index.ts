import { prepareContext } from "../../05-context/06-minimal-context-runtime/context-runtime.js"
import type {
  ModelContext,
  Session,
  SessionMessage,
} from "../../05-context/06-minimal-context-runtime/types.js"
import {
  estimateContextTokens,
  shouldCompact,
} from "./compaction-trigger.js"

const TOKEN_BUDGET = 2_000

function createSession(unitCount: number, detailRepeat: number): Session {
  const messages: SessionMessage[] = []

  for (let unit = 1; unit <= unitCount; unit += 1) {
    const id = `UNIT-${String(unit).padStart(2, "0")}`
    const detail = [
      `这是 ${id} 的任务背景。`,
      "其中包含后续仍可能依赖的约束、决定和执行结果。",
      "这些内容已经被 Context Policy 判断为当前任务需要保留。",
    ].join("")

    messages.push(
      {
        role: "user",
        content: [
          `历史任务 ${id}。`,
          `关键事实 FACT-${id}。`,
          detail.repeat(detailRepeat),
        ].join("\n"),
      },
      {
        role: "assistant",
        content: [
          `已记录 FACT-${id}。`,
          detail.repeat(Math.max(1, detailRepeat - 1)),
        ].join("\n"),
      },
    )
  }

  return { messages }
}

function buildSelectedContext(
  session: Session,
  keepRecentUnits: number,
  label: string,
): ModelContext {
  return prepareContext({
    systemPrompt: "你是一个严格基于当前 Context 工作的 Agent。",
    currentTask: `继续处理 ${label}。当前被选中的历史都视为仍然需要。`,
    session,
    projectContext: [
      "project: yak-agent-harness-learn",
      "stage: compaction:02",
    ].join("\n"),
    policy: {
      history: {
        type: "recent_units",
        maxUnits: keepRecentUnits,
      },
    },
  })
}

function runCase(label: string, context: ModelContext) {
  const estimatedTokens = estimateContextTokens(context)
  const compact = shouldCompact(estimatedTokens, TOKEN_BUDGET)
  const delta = estimatedTokens - TOKEN_BUDGET

  console.log(`\n========== ${label} ==========`)
  console.log(`selected units   : ${context.stats.selectedUnits}`)
  console.log(`context messages : ${context.messages.length}`)
  console.log(`estimated tokens : ${estimatedTokens}`)
  console.log(`token budget     : ${TOKEN_BUDGET}`)
  console.log(`budget delta     : ${delta > 0 ? `+${delta}` : delta}`)
  console.log(`shouldCompact    : ${compact}`)
  console.log(`runtime decision : ${compact ? "COMPACT" : "CONTINUE"}`)

  return compact
}

console.log("========== Compaction 02 · Compaction Trigger ==========")
console.log("这一节只负责判断是否需要进入 Compaction，不执行任何压缩。")

const smallContext = buildSelectedContext(
  createSession(4, 1),
  2,
  "small context case",
)

const largeContext = buildSelectedContext(
  createSession(20, 6),
  12,
  "large context case",
)

const smallDecision = runCase(
  "Case A · Within Budget",
  smallContext,
)

const largeDecision = runCase(
  "Case B · Over Budget",
  largeContext,
)

console.log("\n========== Comparison ==========")
console.log(`small context → ${smallDecision ? "COMPACT" : "CONTINUE"}`)
console.log(`large context → ${largeDecision ? "COMPACT" : "CONTINUE"}`)

console.log("\n========== 关键观察 ==========")
console.log("compaction:01 是人工看到 Context 超预算。")
console.log("compaction:02 把它变成正式 Runtime 判断：shouldCompact()。")
console.log("低于或等于 Budget：继续正常流程。")
console.log("超过 Budget：只标记进入 Compaction 流程。")
console.log("这一节仍然没有压缩、没有 Summary、没有 Hot / Cold。")
console.log("下一节 compaction:03 才讨论：既然要压，哪些 Context 应该保持原样，哪些可以压缩？")
