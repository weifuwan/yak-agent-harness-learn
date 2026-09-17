import {
  buildContext,
  type Message,
  type ModelContext,
} from "./context-builder.js"

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
  "你是一个严格根据给定上下文回答的助手。不要补充未提供的信息。回答尽量简短。"

const currentTask =
  "请告诉我 Session 历史中最近一次出现的 HISTORY 编号。只回复编号，例如 HISTORY-20。"

function createHistory(turnCount: number): Message[] {
  const history: Message[] = []

  for (let turn = 1; turn <= turnCount; turn += 1) {
    const code = `HISTORY-${String(turn).padStart(2, "0")}`

    history.push(
      {
        role: "user",
        content: `旧任务 ${turn}：请记住编号 ${code}。这一轮内容与现在的任务无关。`,
      },
      {
        role: "assistant",
        content: `已记录 ${code}。`,
      },
    )
  }

  return history
}

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

const sessionHistory = createHistory(20)

async function runCase(
  label: string,
  historySelection:
    | { type: "all" }
    | { type: "recent"; maxMessages: number },
) {
  const context = buildContext({
    systemPrompt,
    currentTask,
    sessionHistory,
    historySelection,
  })

  console.log(`\n========== ${label} ==========`)
  console.log(`history policy   : ${context.history.policy}`)
  console.log(`session messages : ${context.history.totalMessages}`)
  console.log(`selected history : ${context.history.selectedMessages}`)
  console.log(`context messages : ${context.messages.length}`)

  const result = await callModel(context)

  console.log(`assistant        : ${result.content}`)
  console.log(`prompt_tokens    : ${token(result.usage.prompt_tokens)}`)

  return {
    answer: result.content,
    promptTokens: token(result.usage.prompt_tokens),
    selectedMessages: context.history.selectedMessages,
  }
}

console.log("========== Context 04 · History Selection ==========")
console.log(`model: ${model}`)
console.log("同一个 Session、同一个当前任务，只改变 History Selection Policy。")
console.log("这一节第一次不再默认把全部 Session History 都送进模型。")

const full = await runCase("Case A · Full History", {
  type: "all",
})

const recent = await runCase("Case B · Recent 6 Messages", {
  type: "recent",
  maxMessages: 6,
})

console.log("\n========== Comparison ==========")
console.log(`full selected messages   : ${full.selectedMessages}`)
console.log(`recent selected messages : ${recent.selectedMessages}`)
console.log(`full prompt_tokens       : ${full.promptTokens}`)
console.log(`recent prompt_tokens     : ${recent.promptTokens}`)
console.log(`full answer              : ${full.answer}`)
console.log(`recent answer            : ${recent.answer}`)

console.log("\n========== 关键观察 ==========")
console.log("Session 仍然完整保存 40 条历史消息。")
console.log("Context Builder 可以只选择最近 6 条历史进入本轮 Model Context。")
console.log("当前任务只关心最近 HISTORY 编号，因此最近历史已经足够完成任务。")
console.log("这说明 Session 可以完整保存，而 Context 不必完整消费。")
console.log("但当前 selectHistory() 只是 history.slice(-N)，它可能从结构中间切断消息。")
console.log("例如 Tool Call 和 Tool Result 如果被拆开，Context 会失去结构完整性。")
console.log("下一节 context:05 会解决 Safe Context Units：历史应该按什么完整单元来选？")
