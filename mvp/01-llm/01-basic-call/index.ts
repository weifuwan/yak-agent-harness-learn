const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const userPrompt = process.argv.slice(2).join(" ").trim() || "用一句话解释 HashMap"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Copy .env.example to .env and fill it in.")
}

const url = `${baseUrl}/chat/completions`
const messages = [
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

console.log("\n========== 01 Basic Call ==========")

console.log("\n[1. Request URL]")
console.log(url)

console.log("\n[2. Request Headers]")
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

console.log("\n[3. Request Body]")
console.log(JSON.stringify(requestBody, null, 2))

const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(requestBody),
})

console.log("\n[4. HTTP Response]")
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

console.log("\n[5. Response Headers]")
console.log(JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2))

const rawBody = await response.text()

console.log("\n[6. Raw Response Body]")
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

console.log("\n[7. Parsed Payload]")
console.log(JSON.stringify(payload, null, 2))

const firstChoice = payload.choices?.[0]
const assistantMessage = firstChoice?.message
const assistantText = assistantMessage?.content?.trim()

console.log("\n[8. First Choice]")
console.log(JSON.stringify(firstChoice ?? null, null, 2))

console.log("\n[9. Assistant Message]")
console.log(JSON.stringify(assistantMessage ?? null, null, 2))

if (!assistantText) {
  throw new Error("Model returned no assistant text")
}

console.log("\n[10. Final Assistant Text]")
console.log(assistantText)

console.log("\n========== End ==========")
