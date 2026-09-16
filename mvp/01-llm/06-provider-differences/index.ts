type Message = {
  role: "system" | "user"
  content: string
}

type ProviderResult = {
  provider: string
  model: string
  content: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

const deepSeekApiKey = process.env.MODEL_API_KEY?.trim()
const deepSeekBaseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const deepSeekModel = process.env.MODEL_NAME?.trim() || "deepseek-flash"

const kimiApiKey = process.env.KIMI_API_KEY?.trim()
const kimiBaseUrl = (process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1").replace(/\/+$/, "")
const kimiModel = process.env.KIMI_MODEL?.trim() || "kimi-k3"

const userPrompt = process.argv.slice(2).join(" ").trim() || "请用三句话解释 Java HashMap。"
const SYSTEM_PROMPT = "你是一个简洁、准确的 Java 编程老师。"

if (!deepSeekApiKey && !kimiApiKey) {
  throw new Error("MODEL_API_KEY or KIMI_API_KEY is required. Copy .env.example to .env and fill at least one key.")
}

function printRequest(title: string, url: string, body: unknown) {
  console.log(`\n========== ${title} ==========`)
  console.log(`URL: ${url}`)
  console.log("Authorization: Bearer <redacted>")
  console.log("Body:")
  console.log(JSON.stringify(body, null, 2))
}

async function callDeepSeek(): Promise<ProviderResult | undefined> {
  if (!deepSeekApiKey) {
    console.log("\n========== Provider A · DeepSeek ==========")
    console.log("未配置 MODEL_API_KEY，本次跳过 DeepSeek。")
    return undefined
  }

  const url = `${deepSeekBaseUrl}/chat/completions`
  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]
  const body = { model: deepSeekModel, messages, stream: false }

  printRequest("Provider A · DeepSeek", url, body)

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${deepSeekApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const rawBody = await response.text()
  if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}: ${rawBody}`)

  const payload = JSON.parse(rawBody) as {
    model?: string
    choices?: Array<{ message?: { content?: string | null } }>
    usage?: {
      prompt_tokens?: number
      completion_tokens?: number
      total_tokens?: number
    }
  }

  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error("DeepSeek returned no assistant text")

  console.log("Assistant path: choices[0].message.content")
  console.log(`Assistant: ${content}`)
  console.log("Usage:", payload.usage ?? {})

  return {
    provider: "DeepSeek",
    model: payload.model ?? deepSeekModel,
    content,
    inputTokens: payload.usage?.prompt_tokens,
    outputTokens: payload.usage?.completion_tokens,
    totalTokens: payload.usage?.total_tokens,
  }
}

async function callKimi(): Promise<ProviderResult | undefined> {
  if (!kimiApiKey) {
    console.log("\n========== Provider B · Kimi ==========")
    console.log("未配置 KIMI_API_KEY，本次跳过 Kimi。")
    return undefined
  }

  const url = `${kimiBaseUrl}/chat/completions`
  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]
  const body = { model: kimiModel, messages, stream: false }

  printRequest("Provider B · Kimi / Moonshot", url, body)

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kimiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const rawBody = await response.text()
  if (!response.ok) throw new Error(`Kimi HTTP ${response.status}: ${rawBody}`)

  const payload = JSON.parse(rawBody) as {
    model?: string
    choices?: Array<{ message?: { content?: string | null } }>
    usage?: {
      prompt_tokens?: number
      completion_tokens?: number
      total_tokens?: number
    }
  }

  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error("Kimi returned no assistant text")

  console.log("Assistant path: choices[0].message.content")
  console.log(`Assistant: ${content}`)
  console.log("Usage:", payload.usage ?? {})

  return {
    provider: "Kimi",
    model: payload.model ?? kimiModel,
    content,
    inputTokens: payload.usage?.prompt_tokens,
    outputTokens: payload.usage?.completion_tokens,
    totalTokens: payload.usage?.total_tokens,
  }
}

console.log("========== 06 Provider Differences ==========")
console.log(`同一个 User Prompt: ${userPrompt}`)
console.log("这一步先观察真实 Provider 差异，不做统一 Provider interface。")

const deepSeekResult = await callDeepSeek()
const kimiResult = await callKimi()

console.log("\n========== Protocol Comparison ==========")
console.table([
  {
    item: "Provider",
    DeepSeek: "DeepSeek",
    Kimi: "Moonshot / Kimi",
  },
  {
    item: "Protocol",
    DeepSeek: "OpenAI-compatible",
    Kimi: "OpenAI-compatible",
  },
  {
    item: "Endpoint",
    DeepSeek: `${deepSeekBaseUrl}/chat/completions`,
    Kimi: `${kimiBaseUrl}/chat/completions`,
  },
  {
    item: "Auth",
    DeepSeek: "Bearer API Key",
    Kimi: "Bearer API Key",
  },
  {
    item: "Assistant",
    DeepSeek: "choices[0].message.content",
    Kimi: "choices[0].message.content",
  },
  {
    item: "Usage",
    DeepSeek: "prompt/completion/total_tokens",
    Kimi: "prompt/completion/total_tokens",
  },
])

console.log("\n========== Result Summary ==========")
console.table(
  [deepSeekResult, kimiResult]
    .filter((result): result is ProviderResult => Boolean(result))
    .map((result) => ({
      provider: result.provider,
      model: result.model,
      inputTokens: result.inputTokens ?? "N/A",
      outputTokens: result.outputTokens ?? "N/A",
      totalTokens: result.totalTokens ?? "N/A",
    })),
)

console.log("\n[关键观察]")
console.log("DeepSeek 和 Kimi 是两个不同 Provider。")
console.log("但它们都兼容 OpenAI Chat Completions，所以简单聊天协议高度相似。")
console.log("Provider 不同，不代表协议一定不同；Provider 与 Protocol 是两个概念。")
console.log("下一节仍然会把 Provider 隔离起来，让 consumer 不依赖具体服务商。")
