import { tools } from "./tools.js"
import type { AssistantMessage, Tool } from "./types.js"

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const userPrompt =
  process.argv.slice(2).join(" ").trim() ||
  "请使用可用工具计算 123 + 456。"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

function createToolRegistry(toolList: Tool[]): Map<string, Tool> {
  const registry = new Map<string, Tool>()

  for (const tool of toolList) {
    if (registry.has(tool.name)) {
      throw new Error(`Duplicate tool name: ${tool.name}`)
    }

    registry.set(tool.name, tool)
  }

  return registry
}

const toolRegistry = createToolRegistry(tools)

const toolSchemas = [...toolRegistry.values()].map((tool) => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
}))

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
      tools: toolSchemas,
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
    content: "你是一个简洁的助手。需要外部能力时，根据用户任务选择最合适的可用工具。",
  },
  {
    role: "user",
    content: userPrompt,
  },
]

console.log("========== Tool 07 · Unified Tool Interface ==========")
console.log(`model: ${model}`)
console.log(`user : ${userPrompt}`)

console.log("\n[Tool Registry]")
console.log([...toolRegistry.keys()])

console.log("\n[Tools sent to model]")
console.log(JSON.stringify(toolSchemas, null, 2))

console.log("\n[关键变化]")
console.log("Schema 从 Tool 对象生成；执行时通过 Registry.get(name) 找 Tool。")
console.log("主流程不再写 add / time / read_file 的 if / else 分发。")

const first = await callDeepSeek(messages, "auto")

console.log("\n[First LLM Response]")
console.log(`finish_reason: ${first.finishReason ?? "N/A"}`)

const toolCalls = first.message.tool_calls ?? []

if (toolCalls.length === 0) {
  console.log("tool_calls: none")
  console.log("assistant:")
  console.log(first.message.content ?? "<empty>")
  console.log("\n模型没有请求 Tool，本次直接结束。")
} else {
  if (toolCalls.length !== 1) {
    throw new Error(
      `tool:07 intentionally supports exactly one tool call per run, but received ${toolCalls.length}`,
    )
  }

  const toolCall = toolCalls[0]!
  const toolCallId = toolCall.id
  const name = toolCall.function?.name
  const rawArguments = toolCall.function?.arguments

  if (!toolCallId) {
    throw new Error("Tool call has no id")
  }

  if (!name) {
    throw new Error("Tool call has no function name")
  }

  if (!rawArguments) {
    throw new Error(`Tool call '${name}' has no arguments`)
  }

  console.log("tool_calls: 1")
  console.log(`id   : ${toolCallId}`)
  console.log(`name : ${name}`)
  console.log(`args : ${rawArguments}`)

  console.log("\n[1. Registry Lookup]")
  const tool = toolRegistry.get(name)
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }
  console.log(`found: ${tool.name}`)

  console.log("\n[2. Unified Execute]")
  console.log(`tool.execute(${JSON.stringify(rawArguments)})`)
  const toolResult = await tool.execute(rawArguments)

  console.log("\n[3. Tool Result]")
  console.log(toolResult)

  messages.push({
    role: "assistant",
    content: first.message.content ?? null,
    tool_calls: first.message.tool_calls,
  })

  messages.push({
    role: "tool",
    tool_call_id: toolCallId,
    content: toolResult,
  })

  const second = await callDeepSeek(messages, "none")

  if ((second.message.tool_calls ?? []).length > 0) {
    throw new Error("tool:07 expected a final assistant response, but model returned tool_calls again")
  }

  console.log("\n[Final Assistant]")
  console.log(second.message.content ?? "<empty>")
}

console.log("\n========== 关键观察 ==========")
console.log("每个 Tool 自己拥有 name / description / parameters / execute。")
console.log("Registry 只负责根据 name 找到 Tool。")
console.log("主流程只认识 Tool 接口，不认识 add / get_current_time / read_file 的内部实现。")
console.log("到这里，Tool 第一阶段的统一管理问题已经解决。")
