import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

export type ToolCall = {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string
  }
}

export interface Tool {
  readonly name: string
  execute(rawArguments: string): Promise<string>
}

type WriteFileArguments = {
  path: string
  content: string
}

function parseWriteFileArguments(rawArguments: string): WriteFileArguments {
  let value: unknown

  try {
    value = JSON.parse(rawArguments)
  } catch {
    throw new Error("write_file arguments must be valid JSON")
  }

  if (!value || typeof value !== "object") {
    throw new Error("write_file arguments must be an object")
  }

  const candidate = value as Record<string, unknown>

  if (typeof candidate.path !== "string" || !candidate.path.trim()) {
    throw new Error("write_file.path must be a non-empty string")
  }

  if (typeof candidate.content !== "string") {
    throw new Error("write_file.content must be a string")
  }

  return {
    path: candidate.path,
    content: candidate.content,
  }
}

export const writeFileTool: Tool = {
  name: "write_file",

  async execute(rawArguments: string): Promise<string> {
    const args = parseWriteFileArguments(rawArguments)

    await mkdir(dirname(args.path), { recursive: true })
    await writeFile(args.path, args.content, "utf8")

    return `wrote ${args.content.length} chars to ${args.path}`
  },
}

export async function executeToolCall(
  toolCall: ToolCall,
  tools: Tool[],
): Promise<string> {
  const tool = tools.find((candidate) => candidate.name === toolCall.function.name)

  if (!tool) {
    throw new Error(`Unknown tool: ${toolCall.function.name}`)
  }

  // permission:01 的故意缺陷就在这里：
  // Tool Call 一旦找到了 Tool，就直接 execute()。
  // 中间没有 checkPermission()，也没有 allow / ask / deny。
  return tool.execute(toolCall.function.arguments)
}
