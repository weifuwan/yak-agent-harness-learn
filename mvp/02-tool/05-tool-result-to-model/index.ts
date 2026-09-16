type ToolCall = {
  id?: string
  type?: string
  function?: {
    name?: string
    arguments?: string
  }
}

type AssistantMessage = {
  role: "assistant"
  content?: string | null
  tool_calls?: ToolCall[]
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

async function callDeepSeek(
  messages: Array<Record<string, unknown>>,
  toolChoice: "auto" | "none",
): Promise<{
  finishReason?: string | null
  message: AssistantMessage
}> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: [addToolSchema],
      tool_choice: toolChoice,
      stream: false,
    }),
  })

  const rawBody = await response.text()
  if (!response.ok) {
    throw new Error(`DeepSeek HTTP ${response.status}: ${rawBody}`)
  }

  const payload = JSON.parse(rawBody) as {
    choices?: Array<{
      finish_reason?: string | null
      message?: AssistantMessage
    }>
  }

  const choice = payload.choices?.[0]
  if (!choice?.message) {
    throw new Error("DeepSeek returned no choices[0].message")
  }

  return {
    finishReason: choice.finish_reason,
    message: choice.message,
  }
}

const messages: Array<Record<string, unknown>> = [
  {
    role: "system",
    content: "你是一个简洁的助手。需要计算时优先考虑可用工具。",
  },
  {
    role: "user",
    content: userPrompt,
  },
]

console.log("========== Tool 05 · Tool Result → Model ==========")
console.log(`model: ${model}`)
console.log(`user : ${userPrompt}`)
console.log("\n这一节第一次完成：Tool Call → Tool Result → 再次调用模型 → Final Assistant。")

console.log("\n========== First LLM Request ==========")
console.log("messages:")
console.log(JSON.stringify(messages, null, 2))

const first = await callDeepSeek(messages, "auto")

console.log("\n[First LLM Response]")
console.log(`finish_reason: ${first.finishReason ?? "N/A"}`)

const toolCalls = first.message.tool_calls ?? []

if (toolCalls.length === 0) {
  console.log("tool_calls: none")
  console.log("assistant:")
  console.log(first.message.content ?? "<empty>")
  console.log("\n模型没有请求 Tool，因此本次不需要第二次 LLM 调用。")
} else {
  if (toolCalls.length !== 1) {
    throw new Error(
      `tool:05 intentionally supports exactly one tool call, but received ${toolCalls.length}`,
    )
  }

  const toolCall = toolCalls[0]!
  const toolCallId = toolCall.id
  const name = toolCall.function?.name
  const rawArguments = toolCall.function?.arguments

  console.log("tool_calls: 1")
  console.log(`id   : ${toolCallId ?? "<missing>"}`)
  console.log(`name : ${name ?? "<missing>"}`)
  console.log(`args : ${rawArguments ?? "<missing>"}`)

  console.log("\n[1. Validate Tool Call]")
  if (!toolCallId) {
    throw new Error("Tool call has no id")
  }

  if (name !== "add") {
    throw new Error(`Unknown tool: ${name ?? "<missing>"}`)
  }

  if (!rawArguments) {
    throw new Error("add tool call has no arguments")
  }

  const args = parseAddArguments(rawArguments)
  console.log({ id: toolCallId, name, args })

  console.log("\n[2. Execute Tool]")
  console.log(`add(${args.a}, ${args.b})`)
  const toolResult = add(args.a, args.b)
  console.log(`result: ${toolResult}`)

  console.log("\n[3. Append Assistant Tool Call Message]")
  messages.push({
    role: "assistant",
    content: first.message.content ?? null,
    tool_calls: first.message.tool_calls,
  })
  console.log("assistant(tool_calls) appended")

  console.log("\n[4. Append Tool Result Message]")
  const toolMessage = {
    role: "tool",
    tool_call_id: toolCallId,
    content: String(toolResult),
  }
  messages.push(toolMessage)
  console.log(toolMessage)

  console.log("\n========== Second LLM Request ==========")
  console.log("messages:")
  console.log(JSON.stringify(messages, null, 2))
  console.log("tool_choice: none")
  console.log("这一轮只让模型根据 Tool Result 生成最终回答，不再继续调用 Tool。")

  const second = await callDeepSeek(messages, "none")

  console.log("\n[Final Assistant]")
  console.log(`finish_reason: ${second.finishReason ?? "N/A"}`)

  if ((second.message.tool_calls ?? []).length > 0) {
    throw new Error("tool:05 expected a final assistant response, but model returned tool_calls again")
  }

  console.log(second.message.content ?? "<empty>")
}

console.log("\n========== 关键观察 ==========")
console.log("第一次 LLM 调用负责产生 Tool Call。")
console.log("Application 执行 Tool，并得到 Tool Result。")
console.log("Tool Result 通过 role=tool + tool_call_id 回到消息历史。")
console.log("第二次 LLM 调用读取 Tool Result，生成最终 Assistant。")
console.log("到这里，一次最小 Tool Calling 闭环完成。")
