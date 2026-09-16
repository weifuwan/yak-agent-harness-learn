import { tools } from "../../02-tool/07-unified-tool-interface/tools.js"
import type {
  AssistantMessage,
  Tool,
} from "../../02-tool/07-unified-tool-interface/types.js"

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const userPrompt =
  process.argv.slice(2).join(" ").trim() ||
  "请先读取 package.json 找到项目名称，再获取当前服务器时间，最后告诉我项目名称和当前时间。每次只调用一个工具。"

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
      tool_choice: "auto",
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
    content:
      "你是一个简洁的助手。需要外部能力时使用工具。每次最多调用一个工具，拿到结果后再决定下一步。",
  },
  {
    role: "user",
    content: userPrompt,
  },
]

console.log("========== Agent Loop 02 · Basic Loop ==========")
console.log(`model: ${model}`)
console.log(`user : ${userPrompt}`)
console.log("\n这一次不再提前规定 LLM 只能调用两次。")
console.log("只要模型继续产生 Tool Call，程序就执行 Tool 并继续下一轮。")

let step = 0

// 这里只是防止真实 API 演示意外失控的保险丝。
// maxSteps 会在 agent-loop:04 正式学习和设计。
const DEMO_CIRCUIT_BREAKER = 12

while (true) {
  step += 1

  if (step > DEMO_CIRCUIT_BREAKER) {
    throw new Error(
      `Demo circuit breaker triggered after ${DEMO_CIRCUIT_BREAKER} LLM steps. ` +
        "agent-loop:04 will formally introduce maxSteps.",
    )
  }

  console.log(`\n========== Loop Step ${step} ==========`)
  console.log(`[LLM] messages count: ${messages.length}`)

  const response = await callDeepSeek(messages)

  console.log(`[LLM] finish_reason: ${response.finishReason ?? "N/A"}`)

  const assistantMessage = {
    role: "assistant",
    content: response.message.content ?? null,
    ...(response.message.tool_calls
      ? { tool_calls: response.message.tool_calls }
      : {}),
  }

  messages.push(assistantMessage)

  const toolCalls = response.message.tool_calls ?? []

  if (toolCalls.length === 0) {
    console.log("[Decision] no tool_calls → break")
    console.log("\n[Final Assistant]")
    console.log(response.message.content ?? "<empty>")
    break
  }

  if (toolCalls.length !== 1) {
    throw new Error(
      `agent-loop:02 intentionally supports exactly one tool call per step, but received ${toolCalls.length}`,
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

  console.log(`[Decision] tool_call → continue`)
  console.log(`[Tool Call] name=${name}, args=${rawArguments}`)

  const tool = toolRegistry.get(name)
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }

  const toolResult = await tool.execute(rawArguments)

  console.log(`[Tool Result] ${toolResult}`)

  messages.push({
    role: "tool",
    tool_call_id: toolCallId,
    content: toolResult,
  })

  console.log("[Loop] Tool Result 已加入 messages，回到 while 顶部继续调用 LLM。")
}

console.log("\n========== 关键观察 ==========")
console.log("agent-loop:01 的 LLM 调用次数由代码提前写死。")
console.log("agent-loop:02 改成 while 循环：模型要 Tool 就 continue，不要 Tool 就 break。")
console.log("所以 LLM / Tool 会运行多少轮，不再提前固定。")
console.log("当前停止判断仍然很粗糙：只看有没有 tool_calls。")
console.log("下一节 agent-loop:03 会专门学习 Stop Condition。")
