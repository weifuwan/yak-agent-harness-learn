const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const userPrompt = process.argv.slice(2).join(" ").trim() || "用一句话解释 HashMap"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Copy .env.example to .env and fill it in.")
}

const messages = [
  {
    role: "user",
    content: userPrompt,
  },
]

console.log("\n[Request]")
console.log(JSON.stringify({ model, messages }, null, 2))

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

const assistantText = payload.choices?.[0]?.message?.content?.trim()

if (!assistantText) {
  throw new Error("Model returned no assistant text")
}

console.log("\n[Assistant]")
console.log(assistantText)
