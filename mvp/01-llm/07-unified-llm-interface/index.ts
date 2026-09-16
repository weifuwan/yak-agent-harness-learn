import { AnthropicProvider } from "./anthropic-provider.js"
import { DeepSeekProvider } from "./deepseek-provider.js"
import type { LLMRequest, Provider } from "./types.js"

const deepSeekApiKey = process.env.MODEL_API_KEY?.trim()
const deepSeekBaseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").trim()
const deepSeekModel = process.env.MODEL_NAME?.trim() || "deepseek-flash"

const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim()
const anthropicBaseUrl = (process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com").trim()
const anthropicModel = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5"

const userPrompt = process.argv.slice(2).join(" ").trim() || "请用三句话解释 Java HashMap。"

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
  console.log(`model: ${provider.model}`)

  const response = await provider.chat(input)

  console.log("assistant:")
  console.log(response.content)
  console.log("usage:")
  console.log(JSON.stringify(response.usage, null, 2))
}

console.log("========== 07 Unified LLM Interface ==========")
console.log(`user: ${userPrompt}`)
console.log("consumer 只认识 Provider.chat(request)，不认识具体 Provider 的 HTTP 协议。")

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
  console.log("未配置 ANTHROPIC_API_KEY，本次跳过真实 Anthropic 请求。")
}

console.log("\n========== 关键观察 ==========")
console.log("DeepSeekProvider 和 AnthropicProvider 内部协议不同。")
console.log("但 consumer 的调用方式完全一样：provider.chat(request)。")
console.log("这就是统一接口带来的价值：把 Provider-specific 细节关在实现内部。")
