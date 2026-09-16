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

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const topic = process.argv.slice(2).join(" ").trim() || "Java HashMap"

const systemMessage: Message = {
  role: "system",
  content: "你是一个简洁、准确的编程老师。回答尽量简短，方便观察 token 使用量。",
}

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Copy .env.example to .env and fill it in.")
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
  if (!content) throw new Error("Model returned no assistant text")

  return {
    content,
    usage: payload.usage ?? {},
  }
}

function token(value: number | undefined) {
  return value ?? "N/A"
}

const prompts = [
  `请用两句话解释 ${topic} 是什么。`,
  `基于你上一轮的解释，再补充一个 ${topic} 的常见使用场景，控制在三句话内。`,
  `结合前面的全部对话，总结 ${topic} 的三个关键点，每点一句。`,
]

const history: Message[] = []
const summary: Array<{
  round: number
  messages: number
  prompt_tokens: number | string
  completion_tokens: number | string
  total_tokens: number | string
}> = []

console.log("========== 05 Token / Context Window ==========")
console.log(`Topic: ${topic}`)
console.log("每一轮都会把之前的 user + assistant 历史重新发送给模型。")

for (let index = 0; index < prompts.length; index += 1) {
  const round = index + 1
  const userMessage: Message = {
    role: "user",
    content: prompts[index]!,
  }

  const requestMessages = [systemMessage, ...history, userMessage]

  console.log(`\n========== Round ${round} ==========`)
  console.log(`messages: ${requestMessages.length}`)
  console.log(`roles: ${requestMessages.map((message) => message.role).join(" → ")}`)
  console.log(`user: ${userMessage.content}`)

  const result = await callModel(requestMessages)

  console.log(`assistant: ${result.content}`)
  console.log("usage:")
  console.log(`  prompt_tokens:     ${token(result.usage.prompt_tokens)}`)
  console.log(`  completion_tokens: ${token(result.usage.completion_tokens)}`)
  console.log(`  total_tokens:      ${token(result.usage.total_tokens)}`)

  summary.push({
    round,
    messages: requestMessages.length,
    prompt_tokens: token(result.usage.prompt_tokens),
    completion_tokens: token(result.usage.completion_tokens),
    total_tokens: token(result.usage.total_tokens),
  })

  history.push(userMessage, {
    role: "assistant",
    content: result.content,
  })
}

console.log("\n========== Summary ==========")
console.table(summary)

console.log("\n[关键观察]")
console.log("Round 1: system + user1")
console.log("Round 2: system + user1 + assistant1 + user2")
console.log("Round 3: system + user1 + assistant1 + user2 + assistant2 + user3")
console.log("")
console.log("历史 messages 越多，通常 prompt_tokens 也会越多。")
console.log("Context Window 有上限，所以历史不能无限增长。")
