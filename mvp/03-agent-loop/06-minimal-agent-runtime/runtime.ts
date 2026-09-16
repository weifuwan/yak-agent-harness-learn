import type {
  AssistantMessage,
  Tool,
  ToolCall,
} from "../../02-tool/07-unified-tool-interface/types.js"
import type {
  AgentRunResult,
  LoopState,
  RunAgentOptions,
} from "./types.js"

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

type LLMConfig = {
  apiKey: string
  baseUrl: string
  model: string
}

const DEFAULT_SYSTEM_PROMPT =
  "你是一个简洁的助手。需要外部能力时使用工具。每次最多调用一个工具，拿到结果后再决定下一步。"

function getLLMConfig(): LLMConfig {
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

function createInitialLoopState(options: RunAgentOptions): LoopState {
  return {
    step: 0,
    maxSteps: options.maxSteps,
    messages: [
      {
        role: "system",
        content: options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: options.prompt,
      },
    ],
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
  config: LLMConfig,
  messages: Array<Record<string, unknown>>,
  toolSchemas: Array<Record<string, unknown>>,
): Promise<{
  finishReason?: string | null
  message: AssistantMessage
}> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
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
      `agent-loop:06 intentionally supports exactly one tool call per step, but received ${toolCalls.length}`,
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

  throw new Error("Invalid model response: no tool_calls and no final assistant content.")
}

async function executeTool(
  toolCall: ToolCall,
  toolRegistry: Map<string, Tool>,
): Promise<{
  toolCallId: string
  result: string
}> {
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

  const tool = toolRegistry.get(name)
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }

  return {
    toolCallId,
    result: await tool.execute(rawArguments),
  }
}

export async function runAgent(options: RunAgentOptions): Promise<AgentRunResult> {
  validateMaxSteps(options.maxSteps)

  const llmConfig = getLLMConfig()
  const state = createInitialLoopState(options)
  const toolRegistry = createToolRegistry(options.tools)
  const toolSchemas = createToolSchemas(options.tools)

  while (state.step < state.maxSteps) {
    state.step += 1

    const response = await callDeepSeek(
      llmConfig,
      state.messages,
      toolSchemas,
    )

    state.messages.push({
      role: "assistant",
      content: response.message.content ?? null,
      ...(response.message.tool_calls
        ? { tool_calls: response.message.tool_calls }
        : {}),
    })

    const decision = decideNextStep(response.message)

    if (decision.type === "done") {
      state.result = {
        status: "done",
        reason: "final_answer",
        steps: state.step,
        content: decision.content,
      }
      break
    }

    if (state.step >= state.maxSteps) {
      state.result = {
        status: "stopped",
        reason: "max_steps",
        steps: state.step,
      }
      break
    }

    const toolResult = await executeTool(
      decision.toolCall,
      toolRegistry,
    )

    state.messages.push({
      role: "tool",
      tool_call_id: toolResult.toolCallId,
      content: toolResult.result,
    })
  }

  if (!state.result) {
    throw new Error("Agent runtime ended without a result")
  }

  return state.result
}
