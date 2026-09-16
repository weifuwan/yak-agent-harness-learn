import { addTool } from "../../02-tool/07-unified-tool-interface/tools.js"
import type {
  AssistantMessage,
  Tool,
} from "../../02-tool/07-unified-tool-interface/types.js"

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const userPrompt =
  process.argv.slice(2).join(" ").trim() ||
  "请使用可用工具计算 123 + 456。"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

const tools: Tool[] = [addTool]
const toolRegistry = new Map(tools.map((tool) => [tool.name, tool]))
const toolSchemas = tools.map((tool) => ({
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
    content: "你是一个简洁的助手。需要计算时使用可用工具。",
  },
  {
    role: "user",
    content: userPrompt,
  },
]

console.log("========== Agent Loop 01 · Manual Two-Step ==========")
console.log(`model: ${model}`)
console.log(`user : ${userPrompt}`)
console.log("\n当前流程完全写死：LLM #1 → 最多一次 Tool → LLM #2 → STOP。")
console.log("这一节没有 while / for 循环。")

console.log("\n========== Step 1 · First LLM Call ==========")
const first = await callDeepSeek(messages, "auto")
console.log(`finish_reason: ${first.finishReason ?? "N/A"}`)

const toolCalls = first.message.tool_calls ?? []

if (toolCalls.length === 0) {
  console.log("tool_calls: none")
  console.log("assistant:")
  console.log(first.message.content ?? "<empty>")
  console.log("\n模型第一次就给出了最终回答，固定流程提前结束。")
} else {
  if (toolCalls.length !== 1) {
    throw new Error(
      `agent-loop:01 intentionally supports exactly one tool call, but received ${toolCalls.length}`,
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

  console.log(`tool: ${name}`)
  console.log(`args: ${rawArguments}`)

  console.log("\n========== Step 2 · Execute One Tool ==========")
  const tool = toolRegistry.get(name)
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }

  const toolResult = await tool.execute(rawArguments)
  console.log(`result: ${toolResult}`)

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

  console.log("\n========== Step 3 · Second LLM Call ==========")
  console.log("tool_choice = none")
  console.log("程序强制第二次调用只能生成最终回答。")

  const second = await callDeepSeek(messages, "none")

  if ((second.message.tool_calls ?? []).length > 0) {
    throw new Error("agent-loop:01 expected a final answer, but model returned tool_calls")
  }

  console.log(`finish_reason: ${second.finishReason ?? "N/A"}`)
  console.log("assistant:")
  console.log(second.message.content ?? "<empty>")
}

console.log("\n========== STOP ==========")
console.log("程序到这里无条件结束。")

console.log("\n[关键观察]")
console.log("这条流程已经有 LLM → Tool → LLM，但它仍然不是 Agent Loop。")
console.log("原因：LLM 调用次数、Tool 执行次数、结束位置全部由代码提前写死。")
console.log("如果第一次 Tool Result 之后模型还需要另一个 Tool，当前程序也不会继续。")
console.log("下一节 agent-loop:02 才会把固定流程改成真正的循环。")
