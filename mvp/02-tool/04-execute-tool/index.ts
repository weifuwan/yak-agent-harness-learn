type ToolCall = {
  id?: string
  type?: string
  function?: {
    name?: string
    arguments?: string
  }
}

type AddArguments = {
  a: number
  b: number
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

function parseAddArguments(rawArguments: string): AddArguments {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawArguments)
  } catch {
    throw new Error(`Tool arguments are not valid JSON: ${rawArguments}`)
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("add arguments must be a JSON object")
  }

  const args = parsed as Record<string, unknown>

  if (typeof args.a !== "number" || !Number.isFinite(args.a)) {
    throw new Error("add argument 'a' must be a finite number")
  }

  if (typeof args.b !== "number" || !Number.isFinite(args.b)) {
    throw new Error("add argument 'b' must be a finite number")
  }

  return {
    a: args.a,
    b: args.b,
  }
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

console.log("========== Tool 04 · Execute Tool ==========")
console.log(`model: ${model}`)
console.log(`user : ${userPrompt}`)
console.log("\n这一节会真正执行 Tool，但不会把 Tool Result 再发回模型。")

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
  console.log("\n模型没有请求 Tool，本次没有任何 Tool 被执行。")
} else {
  for (let index = 0; index < toolCalls.length; index += 1) {
    const toolCall = toolCalls[index]!
    const name = toolCall.function?.name
    const rawArguments = toolCall.function?.arguments

    console.log(`\n========== Tool Call ${index + 1} ==========`)
    console.log(`id   : ${toolCall.id ?? "N/A"}`)
    console.log(`name : ${name ?? "<missing>"}`)
    console.log(`args : ${rawArguments ?? "<missing>"}`)

    console.log("\n[1. Validate Tool Name]")
    if (name !== "add") {
      throw new Error(`Unknown tool: ${name ?? "<missing>"}`)
    }
    console.log("OK: add")

    console.log("\n[2. Parse & Validate Arguments]")
    if (!rawArguments) {
      throw new Error("add tool call has no arguments")
    }
    const args = parseAddArguments(rawArguments)
    console.log(args)

    console.log("\n[3. Execute Tool]")
    console.log(`add(${args.a}, ${args.b})`)
    const toolResult = add(args.a, args.b)

    console.log("\n[4. Tool Result]")
    console.log(toolResult)
  }
}

console.log("\n========== STOP ==========")
console.log("Tool 已经由应用程序执行完成。")
console.log("但 Tool Result 还没有作为 role=tool 发回 DeepSeek。")
console.log("把结果重新交给模型，是下一节 tool:05 的内容。")

console.log("\n[关键观察]")
console.log("LLM 负责生成 Tool Call。")
console.log("Application 负责校验并真正执行 Tool。")
console.log("Tool Call ≠ Tool Execution；执行边界在应用程序。")
