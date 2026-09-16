type Message = {
  role: "system" | "user" | "assistant"
  content: string
}

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const secondQuestion = process.argv.slice(2).join(" ").trim() || "我叫什么？"

const SYSTEM_PROMPT = "你是一个简洁的对话助手。只根据当前请求中提供的信息回答。"
const FIRST_USER_MESSAGE = "请记住：我叫魏福万。只需要简单确认你知道了。"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Copy .env.example to .env and fill it in.")
}

async function callModel(messages: Message[]): Promise<string> {
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
        role?: string
        content?: string | null
      }
    }>
  }

  const text = payload.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error("Model returned no assistant text")
  return text
}

function printMessages(messages: Message[]) {
  for (const message of messages) {
    console.log(`${message.role.padEnd(9)}: ${message.content}`)
  }
}

console.log("\n========== 03 Multi-turn Messages ==========\n")

const firstRoundMessages: Message[] = [
  { role: "system", content: SYSTEM_PROMPT },
  { role: "user", content: FIRST_USER_MESSAGE },
]

const firstAssistant = await callModel(firstRoundMessages)

console.log("[Round 1]")
console.log(`user     : ${FIRST_USER_MESSAGE}`)
console.log(`assistant: ${firstAssistant}`)

const withoutHistory: Message[] = [
  { role: "system", content: SYSTEM_PROMPT },
  { role: "user", content: secondQuestion },
]

console.log("\n[Round 2A · 不带历史]")
console.log("发送给模型的 messages：")
printMessages(withoutHistory)
const withoutHistoryAnswer = await callModel(withoutHistory)
console.log(`\nassistant: ${withoutHistoryAnswer}`)

const withHistory: Message[] = [
  { role: "system", content: SYSTEM_PROMPT },
  { role: "user", content: FIRST_USER_MESSAGE },
  { role: "assistant", content: firstAssistant },
  { role: "user", content: secondQuestion },
]

console.log("\n[Round 2B · 带历史]")
console.log("发送给模型的 messages：")
printMessages(withHistory)
const withHistoryAnswer = await callModel(withHistory)
console.log(`\nassistant: ${withHistoryAnswer}`)

console.log("\n[关键观察]")
console.log("第二轮请求本身是一次新的模型调用。")
console.log("区别只在于：2B 把上一轮的 user + assistant 消息重新放进 messages 发送给了模型。")
console.log("这就是最基础的多轮对话。")

console.log("\n========== End ==========")
