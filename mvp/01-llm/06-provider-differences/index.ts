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

const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim()
const anthropicBaseUrl = (process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com").replace(/\/+$/, "")
const anthropicModel = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5"

const userPrompt = process.argv.slice(2).join(" ").trim() || "请用三句话解释 Java HashMap。"
const SYSTEM_PROMPT = "你是一个简洁、准确的 Java 编程老师。"

if (!deepSeekApiKey) {
  throw new Error("MODEL_API_KEY is required. Copy .env.example to .env and fill it in.")
}

function printRequest(title: string, url: string, headers: Record<string, string>, body: unknown) {
  console.log(`\n========== ${title} ==========`)
  console.log(`URL: ${url}`)
  console.log("Headers:")
  console.log(JSON.stringify(headers, null, 2))
  console.log("Body:")
  console.log(JSON.stringify(body, null, 2))
}

async function callDeepSeek(): Promise<ProviderResult> {
  const url = `${deepSeekBaseUrl}/chat/completions`
  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]
  const body = {
    model: deepSeekModel,
    messages,
    stream: false,
  }

  printRequest(
    "Provider A · DeepSeek (OpenAI-compatible)",
    url,
    {
      Authorization: "Bearer <redacted>",
      "Content-Type": "application/json",
    },
    body,
  )

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${deepSeekApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const rawBody = await response.text()
  if (!response.ok) {
    throw new Error(`DeepSeek HTTP ${response.status}: ${rawBody}`)
  }

  const payload = JSON.parse(rawBody) as {
    model?: string
    choices?: Array<{
      message?: {
        content?: string | null
      }
    }>
    usage?: {
      prompt_tokens?: number
      completion_tokens?: number
      total_tokens?: number
    }
  }

  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error("DeepSeek returned no assistant text")

  console.log("\nAssistant 取值路径:")
  console.log("choices[0].message.content")
  console.log("\nAssistant:")
  console.log(content)
  console.log("\nUsage:")
  console.log(JSON.stringify(payload.usage ?? {}, null, 2))

  return {
    provider: "DeepSeek",
    model: payload.model ?? deepSeekModel,
    content,
    inputTokens: payload.usage?.prompt_tokens,
    outputTokens: payload.usage?.completion_tokens,
    totalTokens: payload.usage?.total_tokens,
  }
}

async function callAnthropic(): Promise<ProviderResult | undefined> {
  if (!anthropicApiKey) {
    console.log("\n========== Provider B · Anthropic ==========")
    console.log("未配置 ANTHROPIC_API_KEY，本次跳过真实 Anthropic 请求。")
    console.log("如需完整对比，在 .env 中填写 ANTHROPIC_API_KEY 和 ANTHROPIC_MODEL 后重新运行。")
    return undefined
  }

  const url = `${anthropicBaseUrl}/v1/messages`
  const body = {
    model: anthropicModel,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    stream: false,
  }

  printRequest(
    "Provider B · Anthropic",
    url,
    {
      "x-api-key": "<redacted>",
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body,
  )

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const rawBody = await response.text()
  if (!response.ok) {
    throw new Error(`Anthropic HTTP ${response.status}: ${rawBody}`)
  }

  const payload = JSON.parse(rawBody) as {
    model?: string
    content?: Array<{
      type?: string
      text?: string
    }>
    usage?: {
      input_tokens?: number
      output_tokens?: number
    }
  }

  const content = (payload.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("")
    .trim()

  if (!content) throw new Error("Anthropic returned no text content")

  console.log("\nAssistant 取值路径:")
  console.log("content[] → type=text → text")
  console.log("\nAssistant:")
  console.log(content)
  console.log("\nUsage:")
  console.log(JSON.stringify(payload.usage ?? {}, null, 2))

  const inputTokens = payload.usage?.input_tokens
  const outputTokens = payload.usage?.output_tokens

  return {
    provider: "Anthropic",
    model: payload.model ?? anthropicModel,
    content,
    inputTokens,
    outputTokens,
    totalTokens:
      inputTokens !== undefined && outputTokens !== undefined
        ? inputTokens + outputTokens
        : undefined,
  }
}

console.log("========== 06 Provider Differences ==========")
console.log(`同一个 User Prompt: ${userPrompt}`)
console.log("这一步先观察差异，不做统一 Provider interface。")

const deepSeekResult = await callDeepSeek()
const anthropicResult = await callAnthropic()

console.log("\n========== Differences ==========")
console.table([
  {
    item: "Endpoint",
    DeepSeek: "/chat/completions",
    Anthropic: "/v1/messages",
  },
  {
    item: "System Prompt",
    DeepSeek: "messages 中 role=system",
    Anthropic: "body.system",
  },
  {
    item: "Assistant",
    DeepSeek: "choices[0].message.content",
    Anthropic: "content[].text",
  },
  {
    item: "Input usage",
    DeepSeek: "prompt_tokens",
    Anthropic: "input_tokens",
  },
  {
    item: "Output usage",
    DeepSeek: "completion_tokens",
    Anthropic: "output_tokens",
  },
])

console.log("\n========== Result Summary ==========")
console.table(
  [deepSeekResult, anthropicResult]
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
console.log("两边做的事情都是：输入 messages / prompt → 得到 Assistant。")
console.log("但 URL、请求 Body、响应结构、Usage 字段并不完全一样。")
console.log("现在先接受这些重复代码；下一节再讨论为什么要统一接口。")
