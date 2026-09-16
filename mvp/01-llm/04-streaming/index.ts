type Message = {
  role: "system" | "user"
  content: string
}

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const userPrompt = process.argv.slice(2).join(" ").trim() || "请详细解释 Java HashMap 的工作原理。"

const messages: Message[] = [
  {
    role: "system",
    content: "你是一个简洁、准确的 Java 编程老师。",
  },
  {
    role: "user",
    content: userPrompt,
  },
]

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Copy .env.example to .env and fill it in.")
}

const url = `${baseUrl}/chat/completions`

async function nonStreaming() {
  console.log("\n========== A. stream: false ==========")
  console.log(`user: ${userPrompt}`)
  console.log("\n等待完整回答...\n")

  const startedAt = Date.now()
  const response = await fetch(url, {
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
  }

  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error("Model returned no assistant text")

  console.log(`[${Date.now() - startedAt} ms 后一次性拿到完整回答]`)
  console.log(content)
}

async function streaming() {
  console.log("\n\n========== B. stream: true ==========")
  console.log(`user: ${userPrompt}`)
  console.log("\n下面开始逐个观察 delta：\n")

  const startedAt = Date.now()
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  })

  if (!response.ok) {
    const rawBody = await response.text()
    throw new Error(`Model HTTP ${response.status}: ${rawBody}`)
  }

  if (!response.body) {
    throw new Error("Streaming response has no body")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ""
  let finalText = ""
  let chunkIndex = 0
  let firstDeltaAt: number | undefined
  let done = false

  while (!done) {
    const result = await reader.read()
    done = result.done
    buffer += decoder.decode(result.value ?? new Uint8Array(), { stream: !done })

    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith("data:")) continue

      const data = trimmed.slice(5).trim()
      if (!data) continue

      if (data === "[DONE]") {
        continue
      }

      const payload = JSON.parse(data) as {
        choices?: Array<{
          delta?: {
            role?: string
            content?: string | null
          }
          finish_reason?: string | null
        }>
      }

      const delta = payload.choices?.[0]?.delta?.content
      if (!delta) continue

      if (firstDeltaAt === undefined) {
        firstDeltaAt = Date.now()
      }

      chunkIndex += 1
      finalText += delta
      console.log(`[delta ${chunkIndex}] ${JSON.stringify(delta)}`)
    }
  }

  console.log("\n---------- 拼接后的完整 Assistant ----------\n")
  console.log(finalText)

  console.log("\n---------- Timing ----------")
  console.log(`首个 delta: ${firstDeltaAt ? firstDeltaAt - startedAt : "N/A"} ms`)
  console.log(`流结束: ${Date.now() - startedAt} ms`)
  console.log(`delta 数量: ${chunkIndex}`)
}

console.log("========== 04 Streaming ==========")
console.log("同一个 Prompt，分别比较 stream:false 和 stream:true。")

await nonStreaming()
await streaming()

console.log("\n\n[关键观察]")
console.log("stream:false → 等完整 message.content 生成完，再一次性返回。")
console.log("stream:true  → 不断收到 delta.content，应用自己把 delta 拼成最终回答。")
