import { prepareContext } from "../../05-context/06-minimal-context-runtime/context-runtime.js"
import type {
  ModelMessage,
  Session,
  SessionMessage,
} from "../../05-context/06-minimal-context-runtime/types.js"
import {
  compactIfNeeded,
  type CompactionResult,
} from "./compaction-runtime.js"

const TOKEN_BUDGET = 2_000
const KEEP_HOT_UNITS = 3
const REQUIRED_FACT = "IMPORTANT-CONSTRAINT-0401"
const RECENT_RESULT = "RECENT-RESULT-0601"

const apiKey = process.env.MODEL_API_KEY?.trim() ?? ""
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"

function createSmallSession(): Session {
  return {
    messages: [
      {
        role: "user",
        content: "小 Context：记住 SMALL-01。",
      },
      {
        role: "assistant",
        content: "已记录 SMALL-01。",
      },
      {
        role: "user",
        content: "小 Context：记住 SMALL-02。",
      },
      {
        role: "assistant",
        content: "已记录 SMALL-02。",
      },
    ],
  }
}

function createLargeSession(): Session {
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
      "这里保存当前任务后续仍可能依赖的约束、决定和中间结论。",
      "Cold 部分故意写得较长，用来稳定制造一次需要 Compaction 的 ModelContext。",
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
              id: "call-compaction-0601",
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
          tool_call_id: "call-compaction-0601",
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

function buildContext(session: Session, recentUnits: number, task: string) {
  return prepareContext({
    systemPrompt: [
      "你是一个严格基于当前 Context 工作的 Agent。",
      "不要猜测 Context 中不存在的事实。",
    ].join("\n"),
    currentTask: task,
    session,
    projectContext: [
      "project: yak-agent-harness-learn",
      "stage: compaction:06",
    ].join("\n"),
    policy: {
      history: {
        type: "recent_units",
        maxUnits: recentUnits,
      },
    },
  })
}

async function callModel(messages: ModelMessage[]): Promise<string> {
  if (!apiKey) {
    throw new Error("MODEL_API_KEY is required for final LLM verification")
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
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

function printResult(label: string, result: CompactionResult) {
  console.log(`\n========== ${label} ==========`)
  console.log(`compacted          : ${result.compacted}`)
  console.log(`reason             : ${result.reason}`)
  console.log(`tokens before      : ${result.beforeTokens}`)
  console.log(`tokens after       : ${result.afterTokens}`)
  console.log(`token budget       : ${TOKEN_BUDGET}`)
  console.log(`within budget after: ${result.withinBudgetAfter}`)
  console.log(`context messages   : ${result.context.messages.length}`)

  if (result.compacted) {
    console.log(`cold units         : ${result.coldUnits}`)
    console.log(`hot units          : ${result.hotUnits}`)
  }
}

console.log("========== Compaction 06 · Minimal Compaction Runtime ==========")
console.log(`model: ${model}`)
console.log("调用方只调用 compactIfNeeded()；内部是否压缩由 Runtime 自己决定。")

const smallContext = buildContext(
  createSmallSession(),
  2,
  "请继续处理小 Context。",
)

const smallResult = await compactIfNeeded({
  context: smallContext,
  tokenBudget: TOKEN_BUDGET,
  keepHotUnits: KEEP_HOT_UNITS,
  apiKey,
  baseUrl,
  model,
})

printResult("Case A · Within Budget", smallResult)

const largeContext = buildContext(
  createLargeSession(),
  10,
  [
    "请同时读取较旧历史中的重要约束标识符，以及最近工具真正返回的值。",
    "只回复：constraint=<标识符>; recent=<值>",
  ].join("\n"),
)

const largeResult = await compactIfNeeded({
  context: largeContext,
  tokenBudget: TOKEN_BUDGET,
  keepHotUnits: KEEP_HOT_UNITS,
  apiKey,
  baseUrl,
  model,
})

printResult("Case B · Over Budget", largeResult)

if (!largeResult.compacted) {
  throw new Error("Demo expected the large Context to be compacted")
}

const answer = await callModel(largeResult.context.messages)
const coldFactUsable = answer.includes(REQUIRED_FACT)
const hotResultUsable = answer.includes(RECENT_RESULT)

console.log("\n========== LLM Verification ==========")
console.log(`assistant         : ${answer}`)
console.log(`cold fact usable  : ${coldFactUsable}`)
console.log(`hot result usable : ${hotResultUsable}`)

console.log("\n========== 关键观察 ==========")
console.log("Case A 没超 Budget：compactIfNeeded() 原样返回，不调用 Summary LLM。")
console.log("Case B 超 Budget：Runtime 内部自动完成 Trigger → Partition → Summary → Rebuild。")
console.log("Agent 调用方不需要知道 Cold / Hot 怎么拆，也不需要自己调用 summarizeColdUnits()。")
console.log("两条分支最终都通过 result.context.messages 暴露可继续使用的模型输入。")
console.log("Compaction Runtime 只做一次最小压缩 pass；更复杂的多级压缩暂时不进入。")
console.log("Compaction 阶段到这里封板。")
