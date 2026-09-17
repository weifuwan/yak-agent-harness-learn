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
  summarizeColdUnits,
} from "../04-summarize-cold-context/summarize-cold.js"
import {
  estimateRebuiltContextTokens,
  rebuildCompactedContext,
  type RebuiltModelContext,
} from "./rebuild-context.js"

const TOKEN_BUDGET = 2_000
const KEEP_RECENT_UNITS = 10
const KEEP_HOT_UNITS = 3
const REQUIRED_FACT = "IMPORTANT-CONSTRAINT-0401"
const RECENT_RESULT = "RECENT-RESULT-0501"

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

function createSession(): Session {
  const messages: SessionMessage[] = []

  for (let unit = 1; unit <= 12; unit += 1) {
    const id = `UNIT-${String(unit).padStart(2, "0")}`
    const importantConstraint =
      unit === 4
        ? `${REQUIRED_FACT}：后续修改不得破坏 NodeNext 模块体系。`
        : ""
    const isHot = unit >= 10
    const detail = [
      `这是 ${id} 的执行背景。`,
      "这里记录当前任务后续仍可能依赖的约束、决定和中间结论。",
      "Cold 部分故意写得较长，用来制造压缩前后的大小差异。",
    ].join("")

    messages.push({
      role: "user",
      content: [
        `历史任务 ${id}。`,
        `关键事实 FACT-${id}。`,
        importantConstraint,
        detail.repeat(isHot ? 1 : 7),
      ]
        .filter(Boolean)
        .join("\n"),
    })

    if (unit === 11) {
      messages.push(
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call-compaction-0501",
              type: "function",
              function: {
                name: "read_latest_result",
                arguments: "{}",
              },
            },
          ],
        },
        {
          role: "tool",
          tool_call_id: "call-compaction-0501",
          content: RECENT_RESULT,
        },
        {
          role: "assistant",
          content: "最近工具结果已经记录。",
        },
      )
      continue
    }

    messages.push({
      role: "assistant",
      content: [
        `已记录 FACT-${id}。`,
        importantConstraint
          ? `已确认必须继续保留 ${REQUIRED_FACT}。`
          : "",
        detail.repeat(isHot ? 1 : 5),
      ]
        .filter(Boolean)
        .join("\n"),
    })
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

async function callModel(context: RebuiltModelContext): Promise<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: context.messages,
      stream: false,
    }),
  })

  const rawBody = await response.text()
  if (!response.ok) {
    throw new Error(`Model HTTP ${response.status}: ${rawBody}`)
  }

  const payload = JSON.parse(rawBody) as {
    choices?: Array<{
      message?: {
        content?: string | null
      }
    }>
  }

  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error("Model returned no assistant text")
  }

  return content
}

const session = createSession()

const originalContext = prepareContext({
  systemPrompt: [
    "你是一个严格基于当前 Context 回答的 Agent。",
    "不要猜测 Context 中不存在的事实。",
  ].join("\n"),
  currentTask: [
    "请同时读取较旧历史中的重要约束标识符，以及最近工具真正返回的值。",
    "只回复：constraint=<标识符>; recent=<值>",
  ].join("\n"),
  session,
  projectContext: [
    "project: yak-agent-harness-learn",
    "stage: compaction:05",
  ].join("\n"),
  policy: {
    history: {
      type: "recent_units",
      maxUnits: KEEP_RECENT_UNITS,
    },
  },
})

const beforeTokens = estimateContextTokens(originalContext)
const compact = shouldCompact(beforeTokens, TOKEN_BUDGET)

if (!compact) {
  throw new Error(
    "Demo expected shouldCompact=true. Increase Cold content or lower TOKEN_BUDGET.",
  )
}

const units = groupHistoryIntoUnits(selectedHistory(originalContext))
const { coldUnits, hotUnits } = splitHotCold(units, KEEP_HOT_UNITS)

console.log("========== Compaction 05 · Rebuild Compacted Context ==========")
console.log("这一节把 Cold Summary + 原始 Hot Units 重新组装成可直接发送给 LLM 的 Context。")
console.log("")
console.log(`model             : ${model}`)
console.log(`selected units    : ${units.length}`)
console.log(`cold units        : ${coldUnits.length} → ${ids(coldUnits)}`)
console.log(`hot units         : ${hotUnits.length} → ${ids(hotUnits)}`)
console.log(`tokens before     : ${beforeTokens}`)
console.log(`token budget      : ${TOKEN_BUDGET}`)

const compactedCold = await summarizeColdUnits({
  coldUnits,
  apiKey,
  baseUrl,
  model,
})

const rebuiltContext = rebuildCompactedContext({
  originalContext,
  coldSummary: compactedCold.summary,
  hotUnits,
})

const afterTokens = estimateRebuiltContextTokens(rebuiltContext)
const withinBudgetAfter = afterTokens <= TOKEN_BUDGET
const coldFactInSummary = compactedCold.summary.includes(REQUIRED_FACT)
const hotResultInRebuiltContext = JSON.stringify(rebuiltContext.messages).includes(
  RECENT_RESULT,
)

console.log("\n========== Rebuilt Context ==========")
console.log(`original messages : ${rebuiltContext.stats.originalContextMessages}`)
console.log(`rebuilt messages  : ${rebuiltContext.stats.rebuiltContextMessages}`)
console.log(`hot units         : ${rebuiltContext.stats.hotUnits}`)
console.log(`hot messages      : ${rebuiltContext.stats.hotMessages}`)
console.log(`cold summary      : ${rebuiltContext.stats.hasCompactedColdSummary}`)
console.log(`tokens after      : ${afterTokens}`)
console.log(`within budget     : ${withinBudgetAfter}`)
console.log(`cold fact present : ${coldFactInSummary}`)
console.log(`hot result present: ${hotResultInRebuiltContext}`)

const answer = await callModel(rebuiltContext)
const answerHasColdFact = answer.includes(REQUIRED_FACT)
const answerHasHotResult = answer.includes(RECENT_RESULT)

console.log("\n========== LLM Verification ==========")
console.log(`assistant         : ${answer}`)
console.log(`cold fact usable  : ${answerHasColdFact}`)
console.log(`hot result usable : ${answerHasHotResult}`)

console.log("\n========== 关键观察 ==========")
console.log("compaction:04 只得到 Cold Summary；compaction:05 才把它重新放回真正的 ModelContext。")
console.log("重建结构是：System/Project + Compacted Cold History + 原始 Hot Units + Current Task。")
console.log("Cold 从完整历史变成 Summary；Hot Tool History 仍然保持原始结构。")
console.log("重建后不仅要更短，还要重新检查是否落回 Budget 内。")
console.log("最终还要真正调用 LLM，验证 Cold 的旧事实和 Hot 的最新结果都还能被使用。")
console.log("04 = Compress；05 = Rebuild。")
console.log("下一节 compaction:06 会把 Trigger / Partition / Summary / Rebuild 收进一个最小 Compaction Runtime。")
