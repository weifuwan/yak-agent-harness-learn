import { readFile } from "node:fs/promises"
import path from "node:path"

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

type ReadFileArguments = {
  path: string
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

function getCurrentTime(): string {
  return new Date().toISOString()
}

async function readProjectFile(filePath: string): Promise<string> {
  const projectRoot = process.cwd()
  const absolutePath = path.resolve(projectRoot, filePath)
  const relativePath = path.relative(projectRoot, absolutePath)

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("read_file only allows files inside the current project directory")
  }

  const content = await readFile(absolutePath, "utf8")
  const maxLength = 6000

  if (content.length <= maxLength) {
    return content
  }

  return `${content.slice(0, maxLength)}\n\n[truncated: file content exceeded ${maxLength} characters]`
}

function parseJsonObject(rawArguments: string): Record<string, unknown> {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawArguments)
  } catch {
    throw new Error(`Tool arguments are not valid JSON: ${rawArguments}`)
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Tool arguments must be a JSON object")
  }

  return parsed as Record<string, unknown>
}

function parseAddArguments(rawArguments: string): AddArguments {
  const args = parseJsonObject(rawArguments)

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

function parseReadFileArguments(rawArguments: string): ReadFileArguments {
  const args = parseJsonObject(rawArguments)

  if (typeof args.path !== "string" || args.path.trim().length === 0) {
    throw new Error("read_file argument 'path' must be a non-empty string")
  }

  return {
    path: args.path.trim(),
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

const getCurrentTimeToolSchema = {
  type: "function",
  function: {
    name: "get_current_time",
    description: "获取当前服务器时间，返回 ISO-8601 UTC 时间字符串。",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
} as const

const readFileToolSchema = {
  type: "function",
  function: {
    name: "read_file",
    description: "读取当前项目目录中的 UTF-8 文本文件。",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "相对于当前项目根目录的文件路径，例如 package.json。",
        },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },
} as const

const tools = [addToolSchema, getCurrentTimeToolSchema, readFileToolSchema]

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
      tools,
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

async function executeTool(name: string, rawArguments: string): Promise<string> {
  if (name === "add") {
    const args = parseAddArguments(rawArguments)
    console.log(`[dispatch] add(${args.a}, ${args.b})`)
    return String(add(args.a, args.b))
  }

  if (name === "get_current_time") {
    parseJsonObject(rawArguments)
    console.log("[dispatch] getCurrentTime()")
    return getCurrentTime()
  }

  if (name === "read_file") {
    const args = parseReadFileArguments(rawArguments)
    console.log(`[dispatch] readProjectFile(${JSON.stringify(args.path)})`)
    return readProjectFile(args.path)
  }

  throw new Error(`Unknown tool: ${name}`)
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

console.log("========== Tool 06 · Multiple Tools ==========")
console.log(`model: ${model}`)
console.log(`user : ${userPrompt}`)
console.log("\n[Available Tools]")
console.log(tools.map((tool) => tool.function.name))
console.log("\n这一节故意使用 if / else 分发 Tool，不做 Registry / Tool Interface。")

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
      `tool:06 intentionally supports exactly one tool call per run, but received ${toolCalls.length}`,
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

  console.log("\n[Dispatch & Execute]")
  const toolResult = await executeTool(name, rawArguments)

  console.log("\n[Tool Result]")
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

  console.log("\n[Second LLM Request]")
  console.log("Tool Result 已加入 messages，第二次请求只生成最终回答。")

  const second = await callDeepSeek(messages, "none")

  if ((second.message.tool_calls ?? []).length > 0) {
    throw new Error("tool:06 expected a final assistant response, but model returned tool_calls again")
  }

  console.log("\n[Final Assistant]")
  console.log(second.message.content ?? "<empty>")
}

console.log("\n========== 关键观察 ==========")
console.log("模型现在不是只有一个 Tool，而是在 add / get_current_time / read_file 中选择。")
console.log("Application 根据 function.name 决定执行哪个分支。")
console.log("Tool 越多，Schema、参数校验、if / else 分发都会继续增长。")
console.log("这就是下一节为什么需要 Unified Tool Interface / Registry。")
