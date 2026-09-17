import {
  buildContext,
  type Message,
  type ModelContext,
  type Session,
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

const systemMessage: Message = {
  role: "system",
  content: "你是一个简洁的助手。只回答当前用户问题，不需要复述旧历史。",
}

const currentPrompt =
  "当前任务：请只回复 CONTEXT-02。不要解释，也不要总结前面的旧任务。"

function createSyntheticSession(turnCount: number): Session {
  const messages: Message[] = []

  for (let turn = 1; turn <= turnCount; turn += 1) {
    messages.push(
      {
        role: "user",
        content:
          `旧任务 ${turn}：这是已经保存在 Session 中的历史。` +
          `请记住 HISTORY-${String(turn).padStart(2, "0")}。`,
      },
      {
        role: "assistant",
        content:
          `已处理旧任务 ${turn}，编号 HISTORY-${String(turn).padStart(2, "0")}。` +
          "这条历史与当前 CONTEXT-02 没有直接关系。",
      },
    )
  }

  return { messages }
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

const checkpoints = [0, 10, 30]
const summary: Array<{
  oldTurns: number
  sessionMessages: number
  contextMessages: number
  promptTokens: number | string
}> = []

console.log("========== Context 02 · Explicit Context Builder ==========")
console.log(`model: ${model}`)
console.log("这一节只建立 Context Builder 边界，不做历史选择。")
console.log("所以行为故意和 context:01 一样：完整 Session 仍然全部进入 Model Context。")

for (const oldTurns of checkpoints) {
  const session = createSyntheticSession(oldTurns)

  // Runtime 不再自己拼接 system + session + current user。
  // 它只把输入交给 buildContext()，然后把 ModelContext 交给 LLM。
  const context = buildContext({
    systemMessage,
    session,
    currentPrompt,
  })

  console.log(`\n========== ${oldTurns} Old Turns ==========`)
  console.log(`session messages : ${session.messages.length}`)
  console.log(`context messages : ${context.messages.length}`)
  console.log("flow             : Session → buildContext() → ModelContext → LLM")

  const result = await callModel(context)

  console.log(`assistant         : ${result.content}`)
  console.log(`prompt_tokens     : ${token(result.usage.prompt_tokens)}`)

  summary.push({
    oldTurns,
    sessionMessages: session.messages.length,
    contextMessages: context.messages.length,
    promptTokens: token(result.usage.prompt_tokens),
  })
}

console.log("\n========== Summary ==========")
console.table(summary)

console.log("\n========== 关键观察 ==========")
console.log("context:01 是 Runtime 直接读取 Session 并拼出请求。")
console.log("context:02 第一次把这个职责收进 buildContext()。")
console.log("LLM 现在只接收 ModelContext，不需要知道 Session 是怎么保存的。")
console.log("但 buildContext() 当前仍然全量返回 Session，所以 prompt_tokens 仍会随着历史增长。")
console.log("这一轮只建立边界，不解决选择问题。")
console.log("下一节 context:03 会研究：Context 除了 Session History，还可能来自哪些信息源？")
