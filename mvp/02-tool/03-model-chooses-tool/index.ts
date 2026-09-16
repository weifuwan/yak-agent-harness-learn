type ToolCall = {
  id?: string
  type?: string
  function?: {
    name?: string
    arguments?: string
  }
}

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const userPrompt =
  process.argv.slice(2).join(" ").trim() ||
  "请使用可用工具计算 123 + 456。"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

function add(a: number, b: number): number {
  return a + b
}

const addToolSchema = {
  type: "function",
  function: {
    name: "add",
    description: "计算两个数字之和。当用户需要做加法计算时使用。",
    parameters: {
      type: "object",
      properties: {
        a: {
          type: "number",
          description: "第一个加数。",
        },
        b: {
          type: "number",
          description: "第二个加数。",
        },
      },
      required: ["a", "b"],
      additionalProperties: false,
    },
  },
} as const

const requestBody = {
  model,
  messages: [
    {
      role: "system",
      content: "你是一个简洁的助手。需要计算时优先考虑可用工具。",
    },
    {
      role: "user",
      content: userPrompt,
    },
  ],
  tools: [addToolSchema],
  tool_choice: "auto",
  stream: false,
}

console.log("========== Tool 03 · Model Chooses Tool ==========")
console.log(`provider: DeepSeek`)
console.log(`model   : ${model}`)
console.log(`user    : ${userPrompt}`)

console.log("\n[Tools sent to model]")
console.log(JSON.stringify(requestBody.tools, null, 2))

console.log("\n[Important]")
console.log("tool_choice = auto → 是否调用工具，由模型决定。")
console.log("这一节只观察 tool_calls，不执行 add()。")

const response = await fetch(`${baseUrl}/chat/completions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(requestBody),
})

const rawBody = await response.text()
if (!response.ok) {
  throw new Error(`DeepSeek HTTP ${response.status}: ${rawBody}`)
}

const payload = JSON.parse(rawBody) as {
  choices?: Array<{
    finish_reason?: string | null
    message?: {
      role?: string
      content?: string | null
      tool_calls?: ToolCall[]
    }
  }>
}

const choice = payload.choices?.[0]
if (!choice) {
  throw new Error("DeepSeek returned no choices[0]")
}

console.log("\n[Model Decision]")
console.log(`finish_reason: ${choice.finish_reason ?? "N/A"}`)

const toolCalls = choice.message?.tool_calls ?? []

if (toolCalls.length === 0) {
  console.log("tool_calls: none")
  console.log("assistant content:")
  console.log(choice.message?.content ?? "<empty>")
  console.log("\n模型这次选择了直接回答，没有调用工具。")
} else {
  console.log(`tool_calls: ${toolCalls.length}`)

  for (let index = 0; index < toolCalls.length; index += 1) {
    const toolCall = toolCalls[index]!
    const name = toolCall.function?.name ?? "<unknown>"
    const rawArguments = toolCall.function?.arguments ?? "{}"

    let parsedArguments: unknown = rawArguments
    try {
      parsedArguments = JSON.parse(rawArguments)
    } catch {
      // 当前阶段只观察模型返回内容；解析失败也不执行任何 Tool。
    }

    console.log(`\n[Tool Call ${index + 1}]`)
    console.log(`id        : ${toolCall.id ?? "N/A"}`)
    console.log(`type      : ${toolCall.type ?? "N/A"}`)
    console.log(`name      : ${name}`)
    console.log(`arguments : ${rawArguments}`)
    console.log("parsed arguments:")
    console.log(parsedArguments)
  }
}

console.log("\n[Executable Function]")
console.log(add.toString())
console.log("\nadd() executed: NO")

console.log("\n[关键观察]")
console.log("Tool Schema 被发送给了 DeepSeek。")
console.log("模型可以返回 tool_calls，表达：我想调用哪个 Tool，以及要传什么参数。")
console.log("但模型并没有真的执行 add()；真正执行 Tool 是下一节 tool:04 的事情。")
