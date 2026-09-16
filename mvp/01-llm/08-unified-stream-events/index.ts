import { AnthropicProvider } from "./anthropic-provider.js"
import { DeepSeekProvider } from "./deepseek-provider.js"
import type { LLMEvent, LLMRequest, Provider } from "./types.js"

const deepSeekApiKey = process.env.MODEL_API_KEY?.trim()
const deepSeekBaseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").trim()
const deepSeekModel = process.env.MODEL_NAME?.trim() || "deepseek-flash"

const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim()
const anthropicBaseUrl = (process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com").trim()
const anthropicModel = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5"

const userPrompt =
  process.argv.slice(2).join(" ").trim() ||
  "请用一小段话解释 Java HashMap，控制在 120 字以内。"

if (!deepSeekApiKey) {
  throw new Error("MODEL_API_KEY is required. Copy .env.example to .env and fill it in.")
}

const request: LLMRequest = {
  system: "你是一个简洁、准确的 Java 编程老师。",
  messages: [
    {
      role: "user",
      content: userPrompt,
    },
  ],
}

async function runProvider(provider: Provider, input: LLMRequest) {
  console.log(`\n========== ${provider.name} ==========`)

  let finalText = ""
  let deltaCount = 0

  for await (const event of provider.stream(input)) {
    handleEvent(event)

    if (event.type === "text-delta") {
      deltaCount += 1
      finalText += event.text
    }
  }

  console.log(`\n[summary] delta count: ${deltaCount}`)
  console.log(`[summary] final text length: ${finalText.length}`)
}

function handleEvent(event: LLMEvent) {
  if (event.type === "start") {
    console.log(`[start] provider=${event.provider}, model=${event.model}`)
    console.log("[assistant]")
    return
  }

  if (event.type === "text-delta") {
    process.stdout.write(event.text)
    return
  }

  console.log("\n[finish]")
}

console.log("========== 08 Unified Stream Events ==========")
console.log(`user: ${userPrompt}`)
console.log("consumer 只认识 LLMEvent，不认识 DeepSeek / Anthropic 的原始流式协议。")

const deepSeek = new DeepSeekProvider({
  apiKey: deepSeekApiKey,
  baseUrl: deepSeekBaseUrl,
  model: deepSeekModel,
})

await runProvider(deepSeek, request)

if (anthropicApiKey) {
  const anthropic = new AnthropicProvider({
    apiKey: anthropicApiKey,
    baseUrl: anthropicBaseUrl,
    model: anthropicModel,
  })

  await runProvider(anthropic, request)
} else {
  console.log("\n========== Anthropic ==========")
  console.log("未配置 ANTHROPIC_API_KEY，本次跳过真实 Anthropic 流式请求。")
}

console.log("\n========== 关键观察 ==========")
console.log("DeepSeek 和 Anthropic 的原始 Streaming 协议不同。")
console.log("但 consumer 最终只处理 start / text-delta / finish。")
console.log("换 Provider 后，runProvider() 和 handleEvent() 都不需要修改。")
