import { DeepSeekProvider } from "./deepseek-provider.js"
import { LLM } from "./llm.js"

const apiKey = process.env.MODEL_API_KEY?.trim()
if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Copy .env.example to .env and fill in the key.")
}

const provider = new DeepSeekProvider({
  apiKey,
  baseUrl: process.env.MODEL_BASE_URL?.trim() || "https://api.deepseek.com",
  model: process.env.MODEL_NAME?.trim() || "deepseek-flash",
})
const llm = new LLM(provider)
const controller = new AbortController()

const prompt =
  process.argv.slice(2).join(" ").trim() ||
  "请用一句话解释：什么是一次 Provider Turn？"

const onInterrupt = () => {
  console.error("\n[abort] cancelling provider request...")
  controller.abort()
}
process.once("SIGINT", onInterrupt)

try {
  for await (const event of llm.stream({
    system: "You are a concise assistant. Answer in Chinese.",
    messages: [{ role: "user", content: prompt }],
    signal: controller.signal,
  })) {
    switch (event.type) {
      case "start":
        console.log(`[start] provider=${event.provider} model=${event.model}`)
        break
      case "text-delta":
        process.stdout.write(event.text)
        break
      case "finish":
        console.log(`\n[finish] reason=${event.reason}`)
        if (event.usage) console.log("[usage]", event.usage)
        break
      case "error":
        console.error(`\n[error] ${event.message}`)
        if (event.aborted) process.exitCode = 130
        else process.exitCode = 1
        break
    }
  }
} finally {
  process.removeListener("SIGINT", onInterrupt)
}
