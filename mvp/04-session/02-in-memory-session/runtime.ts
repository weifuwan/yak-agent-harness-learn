import type {
  AssistantMessage,
  Tool,
  ToolCall,
} from "../../02-tool/07-unified-tool-interface/types.js"
import type { Session } from "./session.js"

export type AgentRunResult =
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

type RunWithSessionOptions = {
  session: Session
  prompt: string
  tools: Tool[]
  maxSteps: number
  systemPrompt?: string
}

type LoopDecision =
  | {
      type: "continue"
      toolCall: ToolCall
    }
  | {
      type: "done"
      content: string
    }

const DEFAULT_SYSTEM_PROMPT =
  "你是一个简洁的助手。需要外部能力时使用工具。每次最多调用一个工具，拿到结果后再决定下一步。"

function getLLMConfig() {
  const apiKey = process.env.MODEL_API_KEY?.trim()
  const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
  const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"

  if (!apiKey) {
    throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
  }

  return {
    apiKey,
    baseUrl,
    model,
  }
}

function validateMaxSteps(maxSteps: number) {
  if (!Number.isInteger(maxSteps) || maxSteps <= 0) {
    throw new Error(`maxSteps must be a positive integer, received: ${maxSteps}`)
  }
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

function createToolSchemas(toolList: Tool[]) {
  return toolList.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}

async function callDeepSeek(
  messages: Array<Record<string, unknown>>,
  toolSchemas: Array<Record<string, unknown>>,
): Promise<AssistantMessage> {
  const config = getLLMConfig()

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    stream: false,
  }

  if (toolSchemas.length > 0) {
    body.tools = toolSchemas
    body.tool_choice = "auto"
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const rawBody = await response.text()
  if (!response.ok) {
    throw new Error(`DeepSeek HTTP ${response.status}: ${rawBody}`)
  }

  const payload = JSON.parse(rawBody) as {
    choices?: Array<{
      message?: AssistantMessage
    }>
  }

  const message = payload.choices?.[0]?.message
  if (!message) {
    throw new Error("DeepSeek returned no choices[0].message")
  }

  return message
}

function decideNextStep(message: AssistantMessage): LoopDecision {
  const toolCalls = message.tool_calls ?? []

  if (toolCalls.length > 1) {
    throw new Error(
      `session:02 intentionally supports exactly one tool call per step, but received ${toolCalls.length}`,
    )
  }

  if (toolCalls.length === 1) {
    return {
      type: "continue",
      toolCall: toolCalls[0]!,
    }
  }

  const content = message.content?.trim()
  if (!content) {
    throw new Error("Invalid model response: no tool_calls and no final assistant content")
  }

  return {
    type: "done",
    content,
  }
}

async function executeTool(toolCall: ToolCall, registry: Map<string, Tool>) {
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

  const tool = registry.get(name)
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }

  return {
    toolCallId,
    content: await tool.execute(rawArguments),
  }
}

export async function runAgentWithSession(
  options: RunWithSessionOptions,
): Promise<AgentRunResult> {
  validateMaxSteps(options.maxSteps)

  const registry = createToolRegistry(options.tools)
  const toolSchemas = createToolSchemas(options.tools)

  // 注意：这一轮 Session 只保存 user / assistant 文本。
  // Tool Call / Tool Result 只存在于当前 Run 的临时 messages 中。
  const messages: Array<Record<string, unknown>> = [
    {
      role: "system",
      content: options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    },
    ...options.session.messages,
    {
      role: "user",
      content: options.prompt,
    },
  ]

  let step = 0

  while (step < options.maxSteps) {
    step += 1

    const assistant = await callDeepSeek(messages, toolSchemas)

    messages.push({
      role: "assistant",
      content: assistant.content ?? null,
      ...(assistant.tool_calls ? { tool_calls: assistant.tool_calls } : {}),
    })

    const decision = decideNextStep(assistant)

    if (decision.type === "done") {
      options.session.messages.push(
        {
          role: "user",
          content: options.prompt,
        },
        {
          role: "assistant",
          content: decision.content,
        },
      )

      return {
        status: "done",
        reason: "final_answer",
        steps: step,
        content: decision.content,
      }
    }

    if (step >= options.maxSteps) {
      return {
        status: "stopped",
        reason: "max_steps",
        steps: step,
      }
    }

    const toolResult = await executeTool(decision.toolCall, registry)

    messages.push({
      role: "tool",
      tool_call_id: toolResult.toolCallId,
      content: toolResult.content,
    })
  }

  throw new Error("Session runtime ended without a result")
}
