import { prepareContext } from "./context-runtime.js"
import type {
  ModelContext,
  Session,
  SessionMessage,
} from "./types.js"

type Usage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

type ModelResult = {
  content: string
  usage: Usage
}

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

const session: Session = {
  messages: [
    {
      role: "user",
      content: "旧对话：请记住 OLD-01。",
    },
    {
      role: "assistant",
      content: "已记录 OLD-01。",
    },
    {
      role: "user",
      content: "请调用 get_current_time，并记住工具真正返回的值。",
    },
    {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call-context-0601",
          type: "function",
          function: {
            name: "get_current_time",
            arguments: "{}",
          },
        },
      ],
    },
    {
      role: "tool",
      tool_call_id: "call-context-0601",
      content: "TOOL-VALUE-0601",
    },
    {
      role: "assistant",
      content: "工具结果已经记录。",
    },
    {
      role: "user",
      content: "最近一轮普通对话：请记住 CURRENT-03。",
    },
    {
      role: "assistant",
      content: "已记录 CURRENT-03。",
    },
  ],
}

const systemPrompt = [
  "你是一个严格基于给定 Context 回答的助手。",
  "不要使用外部知识猜测缺失信息。",
  "只按用户要求的格式回答。",
].join("\n")

const projectContext = [
  "项目名：yak-agent-harness-learn",
  "runtime：Node >=22",
  "language：TypeScript",
  "runner：tsx",
].join("\n")

const currentTask =
  "请根据当前 Context 告诉我项目 runtime 和最近一次工具返回值。只回复：runtime=<值>; tool=<值>"

async function callModel(context: ModelContext): Promise<ModelResult> {
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
    usage?: Usage
  }

  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error("Model returned no assistant text")
  }

  return {
    content,
    usage: payload.usage ?? {},
  }
}

function describeHistory(messages: SessionMessage[]): string {
  return messages
    .map((message) => {
      if (message.role === "assistant" && message.tool_calls?.length) {
        return `assistant(tool_call:${message.tool_calls[0]?.id})`
      }

      if (message.role === "tool") {
        return `tool(result:${message.tool_call_id})`
      }

      return message.role
    })
    .join(" → ")
}

function token(value: number | undefined): number | string {
  return value ?? "N/A"
}

async function runAgentTurn() {
  // Agent Runtime 只需要调用这一个入口。
  // 它不再自己 group / validate / select / flatten Session History。
  const context = prepareContext({
    systemPrompt,
    currentTask,
    session,
    projectContext,
    policy: {
      history: {
        type: "recent_units",
        maxUnits: 2,
      },
    },
  })

  const selectedHistory = context.messages.slice(1, -1) as SessionMessage[]

  console.log("========== Context 06 · Minimal Context Runtime ==========")
  console.log(`model                  : ${model}`)
  console.log(`session history        : ${context.stats.totalHistoryMessages} messages`)
  console.log(`session units          : ${context.stats.totalUnits}`)
  console.log(`history policy         : ${context.stats.historyPolicy}`)
  console.log(`selected units         : ${context.stats.selectedUnits}`)
  console.log(`selected history       : ${context.stats.selectedHistoryMessages} messages`)
  console.log(`project context        : ${context.stats.hasProjectContext}`)
  console.log(`selected roles         : ${describeHistory(selectedHistory)}`)

  const result = await callModel(context)

  console.log(`assistant               : ${result.content}`)
  console.log(`prompt_tokens           : ${token(result.usage.prompt_tokens)}`)

  return {
    context,
    result,
  }
}

const { context } = await runAgentTurn()

console.log("\n========== 关键观察 ==========")
console.log("调用方只调用 prepareContext()，不需要知道 Context 内部怎么构造。")
console.log("Sources：System / Current Task / Session / Project Context 统一进入 Runtime。")
console.log("Selection：recent_units:2 控制本轮只消费最近两个完整历史单元。")
console.log("Integrity：Tool Call / Tool Result 在同一个 Context Unit 内成组保留。")
console.log("Output：Runtime 最终只返回可直接发送给 LLM 的 ModelContext。")
console.log(`最终 Model Context messages: ${context.messages.length}`)
console.log("Context 阶段到这里封板；下一阶段进入 Compaction。")
