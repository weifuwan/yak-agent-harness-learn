const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const userPrompt = process.argv.slice(2).join(" ").trim() || "解释一下 HashMap"

const SYSTEM_PROMPT = "你是一个专业的 Java 编程助手。回答简洁，优先使用初学者能理解的语言。"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Copy .env.example to .env and fill it in.")
}

const url = `${baseUrl}/chat/completions`
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
const requestBody = {
  model,
  messages,
  stream: false,
}

console.log("\n========== 02 Message Roles ==========")

console.log("\n[1. System Prompt]")
console.log(SYSTEM_PROMPT)

console.log("\n[2. User Prompt]")
console.log(userPrompt)

console.log("\n[3. Messages]")
console.log(JSON.stringify(messages, null, 2))

console.log("\n[4. Request URL]")
console.log(url)

console.log("\n[5. Request Headers]")
console.log(
  JSON.stringify(
    {
      Authorization: "Bearer <redacted>",
      "Content-Type": "application/json",
    },
    null,
    2,
  ),
)

console.log("\n[6. Request Body]")
console.log(JSON.stringify(requestBody, null, 2))

const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(requestBody),
})

console.log("\n[7. HTTP Response]")
console.log(
  JSON.stringify(
    {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    },
    null,
    2,
  ),
)

console.log("\n[8. Response Headers]")
console.log(JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2))

const rawBody = await response.text()

console.log("\n[9. Raw Response Body]")
console.log(rawBody)

if (!response.ok) {
  throw new Error(`Model HTTP ${response.status}: ${rawBody}`)
}

const payload = JSON.parse(rawBody) as {
  id?: string
  object?: string
  created?: number
  model?: string
  choices?: Array<{
    index?: number
    message?: {
      role?: string
      content?: string | null
    }
    finish_reason?: string | null
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

console.log("\n[10. Parsed Payload]")
console.log(JSON.stringify(payload, null, 2))

const firstChoice = payload.choices?.[0]
const assistantMessage = firstChoice?.message
const assistantText = assistantMessage?.content?.trim()

console.log("\n[11. First Choice]")
console.log(JSON.stringify(firstChoice ?? null, null, 2))

console.log("\n[12. Assistant Message]")
console.log(JSON.stringify(assistantMessage ?? null, null, 2))

console.log("\n[13. Assistant Role]")
console.log(assistantMessage?.role ?? "assistant")

if (!assistantText) {
  throw new Error("Model returned no assistant text")
}

console.log("\n[14. Final Assistant Text]")
console.log(assistantText)

console.log("\n========== End ==========")
