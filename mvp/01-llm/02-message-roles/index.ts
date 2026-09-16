const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const userPrompt = process.argv.slice(2).join(" ").trim() || "解释一下 HashMap"

const SYSTEM_PROMPT = "你是一个专业的 Java 编程助手。回答简洁，优先使用初学者能理解的语言。"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Copy .env.example to .env and fill it in.")
}

const messages = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
  {
    role: "user",
    content: userPrompt,
  },
]

console.log("\n[Messages]")
console.log(JSON.stringify(messages, null, 2))

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

const body = await response.text()

if (!response.ok) {
  throw new Error(`Model HTTP ${response.status}: ${body}`)
}

const payload = JSON.parse(body) as {
  choices?: Array<{
    message?: {
      role?: string
      content?: string | null
    }
  }>
}

const assistant = payload.choices?.[0]?.message
const assistantText = assistant?.content?.trim()

if (!assistantText) {
  throw new Error("Model returned no assistant text")
}

console.log("\n[Assistant Role]")
console.log(assistant?.role ?? "assistant")

console.log("\n[Assistant Content]")
console.log(assistantText)
