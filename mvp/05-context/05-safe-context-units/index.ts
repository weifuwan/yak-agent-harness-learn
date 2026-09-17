import {
  buildContext,
  type ModelContext,
} from "./context-builder.js"
import {
  groupIntoContextUnits,
  type SessionMessage,
} from "./context-unit.js"

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

const systemPrompt =
  "你是一个严格根据给定历史回答的助手。不要猜测。回答尽量简短。"

const currentTask =
  "最近一轮工具调用实际返回了什么值？只回复工具返回值本身。"

const sessionHistory: SessionMessage[] = [
  {
    role: "user",
    content: "普通对话 1：请记住编号 NORMAL-01。",
  },
  {
    role: "assistant",
    content: "已记录 NORMAL-01。",
  },
  {
    role: "user",
    content: "普通对话 2：请记住编号 NORMAL-02。",
  },
  {
    role: "assistant",
    content: "已记录 NORMAL-02。",
  },
  {
    role: "user",
    content: "请读取当前时间，并记住工具真正返回的值。",
  },
  {
    role: "assistant",
    content: null,
    tool_calls: [
      {
        id: "call-context-0501",
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
    tool_call_id: "call-context-0501",
    content: "TOOL-VALUE-0501",
  },
  {
    role: "assistant",
    content: "工具结果已经记录。",
  },
]

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

function token(value: number | undefined): number | string {
  return value ?? "N/A"
}

function describeMessages(messages: SessionMessage[]): string {
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

console.log("========== Context 05 · Safe Context Units ==========")
console.log(`model: ${model}`)

const units = groupIntoContextUnits(sessionHistory)

console.log(`\nSession messages: ${sessionHistory.length}`)
console.log(`Context Units   : ${units.length}`)

for (let index = 0; index < units.length; index += 1) {
  const unit = units[index]!
  console.log(`Unit ${index + 1}: ${describeMessages(unit.messages)}`)
}

console.log("\n========== Naive Message Slice ==========")
const naiveRecentMessages = sessionHistory.slice(-2)
console.log(`slice(-2): ${describeMessages(naiveRecentMessages)}`)

try {
  groupIntoContextUnits(naiveRecentMessages)
  console.log("naive structure: valid")
} catch (error) {
  console.log(
    `naive structure: broken -> ${error instanceof Error ? error.message : String(error)}`,
  )
}

console.log("\n========== Safe Unit Selection ==========")
const context = buildContext({
  systemPrompt,
  currentTask,
  sessionHistory,
  historySelection: {
    type: "recent_units",
    maxUnits: 1,
  },
})

const selectedHistory = context.messages.slice(1, -1) as SessionMessage[]

console.log(`history policy   : ${context.history.policy}`)
console.log(`session messages : ${context.history.totalMessages}`)
console.log(`session units    : ${context.history.totalUnits}`)
console.log(`selected units   : ${context.history.selectedUnits}`)
console.log(`selected messages: ${context.history.selectedMessages}`)
console.log(`selected roles   : ${describeMessages(selectedHistory)}`)

const result = await callModel(context)

console.log(`assistant        : ${result.content}`)
console.log(`prompt_tokens    : ${token(result.usage.prompt_tokens)}`)

console.log("\n========== 关键观察 ==========")
console.log("context:04 按 Message 数量选择；context:05 改成按 Context Unit 选择。")
console.log("slice(-2) 会得到 tool(result) + assistant(final)，丢失对应的 assistant(tool_call)。")
console.log("最近 1 个 Context Unit 会完整保留 user + tool_call + tool_result + assistant(final)。")
console.log("所以 History Selection 的最小单位不一定是一条 Message。")
console.log("04 = Quantity；05 = Integrity。")
console.log("下一节 context:06 会把 Sources、Selection、Safe Units 和 Builder 收进最小 Context Runtime。")
