type Message = {
  role: "system" | "user" | "assistant"
  content: string
}

type Usage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

type ModelResult = {
  content: string
  usage: Usage
}

type Session = {
  messages: Message[]
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
  "当前任务：请只回复 CONTEXT-01。不要解释，也不要总结前面的旧任务。"

function createSyntheticSession(turnCount: number): Session {
  const messages: Message[] = []

  for (let turn = 1; turn <= turnCount; turn += 1) {
    messages.push(
      {
        role: "user",
        content:
          `旧任务 ${turn}：这是为了模拟已经持久化在 Session 中的历史。` +
          `请记住旧编号 HISTORY-${String(turn).padStart(2, "0")}，` +
          "并讨论一个与当前 CONTEXT-01 完全无关的历史话题。",
      },
      {
        role: "assistant",
        content:
          `已处理旧任务 ${turn}，旧编号是 HISTORY-${String(turn).padStart(2, "0")}。` +
          "这条 assistant 消息同样属于 Session 的完整历史，但对当前任务没有直接帮助。",
      },
    )
  }

  return { messages }
}

async function callModel(messages: Message[]): Promise<ModelResult> {
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
  requestMessages: number
  promptTokens: number | string
  completionTokens: number | string
}> = []

console.log("========== Context 01 · Full Session As Context ==========")
console.log(`model: ${model}`)
console.log("当前策略故意非常简单：Session 有多少历史，就全部塞进 Model Context。")
console.log(`current task: ${currentPrompt}`)

for (const oldTurns of checkpoints) {
  const session = createSyntheticSession(oldTurns)

  // 这就是 context:01 故意暴露的问题：
  // 完整 Session.messages 被原封不动地当成本轮 Model Context。
  const requestMessages: Message[] = [
    systemMessage,
    ...session.messages,
    {
      role: "user",
      content: currentPrompt,
    },
  ]

  console.log(`\n========== ${oldTurns} Old Turns ==========`)
  console.log(`session messages : ${session.messages.length}`)
  console.log(`request messages : ${requestMessages.length}`)
  console.log(
    `context formula  : system(1) + full session(${session.messages.length}) + current user(1)`,
  )

  const result = await callModel(requestMessages)

  console.log(`assistant         : ${result.content}`)
  console.log(`prompt_tokens     : ${token(result.usage.prompt_tokens)}`)
  console.log(`completion_tokens : ${token(result.usage.completion_tokens)}`)

  summary.push({
    oldTurns,
    sessionMessages: session.messages.length,
    requestMessages: requestMessages.length,
    promptTokens: token(result.usage.prompt_tokens),
    completionTokens: token(result.usage.completion_tokens),
  })
}

console.log("\n========== Summary ==========")
console.table(summary)

console.log("\n========== 关键观察 ==========")
console.log("三个请求的当前任务完全相同，变化的只有旧 Session 历史数量。")
console.log("context:01 没有任何选择策略：完整 Session.messages 直接进入每次 LLM Request。")
console.log("旧历史越多，request messages 越多，通常 prompt_tokens 也会随之增加。")
console.log("其中很多 HISTORY-* 历史与当前 CONTEXT-01 任务完全无关，却仍然重复发送。")
console.log("所以：Session 是完整事实历史，但完整 Session 不应该天然等于本轮 Model Context。")
console.log("下一节 context:02 才会第一次引入显式 Context Builder。")
