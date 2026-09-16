import { DeepSeekProvider } from "./deepseek-provider.js"
import { KimiProvider } from "./kimi-provider.js"
import type { LLMEvent, LLMRequest, Provider } from "./types.js"

const deepSeekApiKey = process.env.MODEL_API_KEY?.trim()
const deepSeekBaseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").trim()
const deepSeekModel = process.env.MODEL_NAME?.trim() || "deepseek-flash"

const kimiApiKey = process.env.KIMI_API_KEY?.trim()
const kimiBaseUrl = (process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1").trim()
const kimiModel = process.env.KIMI_MODEL?.trim() || "kimi-k3"

const userPrompt =
  process.argv.slice(2).join(" ").trim() ||
  "请用一小段话解释 Java HashMap，控制在 120 字以内。"

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
console.log("consumer 只认识 LLMEvent，不认识具体 Provider 的 SSE 解析细节。")

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
console.log("DeepSeek 和 Kimi 当前都兼容 OpenAI Chat Completions Streaming。")
console.log("所以两边原始流都能从 choices[0].delta.content 读取文本，并以 [DONE] 结束。")
console.log("但 consumer 仍然只处理 start / text-delta / finish。")
console.log("换 Provider 后，runProvider() 和 handleEvent() 都不需要修改。")
