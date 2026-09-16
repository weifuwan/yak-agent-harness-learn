import { DeepSeekProvider } from "./deepseek-provider.js"
import { KimiProvider } from "./kimi-provider.js"
import type { LLMRequest, Provider } from "./types.js"

const deepSeekApiKey = process.env.MODEL_API_KEY?.trim()
const deepSeekBaseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").trim()
const deepSeekModel = process.env.MODEL_NAME?.trim() || "deepseek-flash"

const kimiApiKey = process.env.KIMI_API_KEY?.trim()
const kimiBaseUrl = (process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1").trim()
const kimiModel = process.env.KIMI_MODEL?.trim() || "kimi-k3"

const userPrompt = process.argv.slice(2).join(" ").trim() || "请用三句话解释 Java HashMap。"

if (!deepSeekApiKey && !kimiApiKey) {
  throw new Error("MODEL_API_KEY or KIMI_API_KEY is required. Copy .env.example to .env and fill at least one key.")
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
console.log("consumer 只认识 Provider.chat(request)，不认识具体 Provider 的 URL / API Key / Model。")

if (deepSeekApiKey) {
  const deepSeek = new DeepSeekProvider({
    apiKey: deepSeekApiKey,
    baseUrl: deepSeekBaseUrl,
    model: deepSeekModel,
  })
  await runProvider(deepSeek, request)
} else {
  console.log("\n========== DeepSeek ==========")
  console.log("未配置 MODEL_API_KEY，本次跳过 DeepSeek。")
}

if (kimiApiKey) {
  const kimi = new KimiProvider({
    apiKey: kimiApiKey,
    baseUrl: kimiBaseUrl,
    model: kimiModel,
  })
  await runProvider(kimi, request)
} else {
  console.log("\n========== Kimi ==========")
  console.log("未配置 KIMI_API_KEY，本次跳过 Kimi。")
}

console.log("\n========== 关键观察 ==========")
console.log("DeepSeekProvider 和 KimiProvider 是两个不同实现。")
console.log("它们当前都兼容 OpenAI Chat Completions，所以内部代码很相似。")
console.log("但 consumer 的调用方式完全一样：provider.chat(request)。")
console.log("换 Provider 后，runProvider() 不需要修改。")
