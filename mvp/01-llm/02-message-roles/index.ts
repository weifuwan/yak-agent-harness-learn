const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const userPrompt = process.argv.slice(2).join(" ").trim() || "解释一下 HashMap"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Copy .env.example to .env and fill it in.")
}

const personas = [
  {
    name: "资深 Java 工程师",
    systemPrompt: "你是一名资深 Java 工程师。回答准确、专业，适当补充实现原理和工程实践。",
  },
  {
    name: "初学者老师",
    systemPrompt: "你是一名面向零基础学生的 Java 老师。使用简单语言和生活化类比，避免一次讲太多概念。",
  },
  {
    name: "Java 面试官",
    systemPrompt: "你是一名 Java 面试官。回答时突出面试高频点、容易追问的知识点，并尽量简洁。",
  },
] as const

const url = `${baseUrl}/chat/completions`

console.log("\n========== 02 Message Roles / Persona Comparison ==========")
console.log("\n本实验保持 User Prompt 完全不变，只改变 System Prompt 定义的 persona。")
console.log("注意：system / user / assistant 是消息角色；Java 工程师 / 老师 / 面试官是 system 定义的人设。")

console.log("\n[User Prompt - 三次请求完全相同]")
console.log(userPrompt)

for (let index = 0; index < personas.length; index += 1) {
  const persona = personas[index]!
  const messages = [
    {
      role: "system",
      content: persona.systemPrompt,
    },
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

  console.log(`\n\n========== Persona ${index + 1}: ${persona.name} ==========`)

  console.log("\n[1. System Prompt]")
  console.log(persona.systemPrompt)

  console.log("\n[2. Messages]")
  console.log(JSON.stringify(messages, null, 2))

  console.log("\n[3. Request URL]")
  console.log(url)

  console.log("\n[4. Request Headers]")
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

  console.log("\n[5. Request Body]")
  console.log(JSON.stringify(requestBody, null, 2))

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })

  console.log("\n[6. HTTP Response]")
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

  console.log("\n[7. Response Headers]")
  console.log(JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2))

  const rawBody = await response.text()

  console.log("\n[8. Raw Response Body]")
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

  console.log("\n[9. Parsed Payload]")
  console.log(JSON.stringify(payload, null, 2))

  const firstChoice = payload.choices?.[0]
  const assistantMessage = firstChoice?.message
  const assistantText = assistantMessage?.content?.trim()

  console.log("\n[10. Assistant Message]")
  console.log(JSON.stringify(assistantMessage ?? null, null, 2))

  if (!assistantText) {
    throw new Error("Model returned no assistant text")
  }

  console.log("\n[11. Final Assistant Text]")
  console.log(assistantText)
}

console.log("\n\n========== Comparison Question ==========")
console.log("请观察：同一个 User Prompt 下，三个回答在术语深度、表达方式、关注重点上有什么不同？")
console.log("这就是 System Prompt 对模型行为的最基础影响。")
console.log("\n========== End ==========")
