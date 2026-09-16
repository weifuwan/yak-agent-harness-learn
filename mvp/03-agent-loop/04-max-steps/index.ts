import { tools } from "../../02-tool/07-unified-tool-interface/tools.js"
import type {
  AssistantMessage,
  Tool,
  ToolCall,
} from "../../02-tool/07-unified-tool-interface/types.js"

type LoopDecision =
  | {
      type: "continue"
      reason: "tool_call"
      toolCall: ToolCall
    }
  | {
      type: "done"
      reason: "final_answer"
      content: string
    }

type AgentRunResult =
  | {
      status: "done"
      reason: "final_answer"
      steps: number
      content: string
    }
  | {
      status: "stopped"
      reason: "max_steps"
      steps: number
    }

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const userPrompt =
  process.argv.slice(2).join(" ").trim() ||
  "请先读取 package.json 找到项目名称，再获取当前服务器时间，最后告诉我项目名称和当前时间。每次只调用一个工具。"

const maxSteps = parsePositiveInteger(process.env.AGENT_MAX_STEPS ?? "4", "AGENT_MAX_STEPS")

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

function parsePositiveInteger(rawValue: string, name: string): number {
  const value = Number(rawValue)

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, received: ${rawValue}`)
  }

  return value
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

function decideNextStep(message: AssistantMessage): LoopDecision {
  const toolCalls = message.tool_calls ?? []

  if (toolCalls.length > 1) {
    throw new Error(
      `agent-loop:04 intentionally supports exactly one tool call per step, but received ${toolCalls.length}`,
    )
  }

  if (toolCalls.length === 1) {
    return {
      type: "continue",
      reason: "tool_call",
      toolCall: toolCalls[0]!,
    }
  }

  const content = message.content?.trim()
  if (content) {
    return {
      type: "done",
      reason: "final_answer",
      content,
    }
  }

  throw new Error(
    "Invalid model response: no tool_calls and no final assistant content.",
  )
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

console.log("========== Agent Loop 04 · Max Steps ==========")
console.log(`model    : ${model}`)
console.log(`user     : ${userPrompt}`)
console.log(`maxSteps : ${maxSteps}`)
console.log("\nmaxSteps = 最多允许多少次 LLM 决策。")
console.log("正常完成 → final_answer；一直不完成 → max_steps。")

let step = 0
let result: AgentRunResult | undefined

while (step < maxSteps) {
  step += 1

  console.log(`\n========== Loop Step ${step} / ${maxSteps} ==========`)
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

  const decision = decideNextStep(response.message)
  console.log(`[Decision] type=${decision.type}, reason=${decision.reason}`)

  if (decision.type === "done") {
    result = {
      status: "done",
      reason: "final_answer",
      steps: step,
      content: decision.content,
    }
    break
  }

  if (step >= maxSteps) {
    console.log("[Runtime] 模型还想继续调用 Tool，但 maxSteps 已耗尽。")
    console.log("[Runtime] 不再执行新的 Tool Call，强制停止。")

    result = {
      status: "stopped",
      reason: "max_steps",
      steps: step,
    }
    break
  }

  const toolCall = decision.toolCall
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

  console.log("[Loop] CONTINUE → Tool Result 已加入 messages，进入下一轮。")
}

if (!result) {
  throw new Error("Agent loop ended without an AgentRunResult")
}

console.log("\n========== Agent Result ==========")
console.log(`status : ${result.status}`)
console.log(`reason : ${result.reason}`)
console.log(`steps  : ${result.steps}`)

if (result.status === "done") {
  console.log("\n[Final Assistant]")
  console.log(result.content)
} else {
  console.log("\nAgent 没有正常完成任务，而是被 Runtime 的 maxSteps 边界截停。")
}

console.log("\n========== 关键观察 ==========")
console.log("final_answer 是模型驱动的正常停止。")
console.log("max_steps 是 Runtime 驱动的保护性停止。")
console.log("Agent 不能把是否无限继续完全交给模型决定。")
console.log("达到最后一个允许的 LLM Step 后，如果模型还想调用 Tool，不再执行那个 Tool。")
console.log("下一节 agent-loop:05 会把 step / messages / result 等运行数据收进 Loop State。")
