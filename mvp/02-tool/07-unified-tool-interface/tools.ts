import { readFile } from "node:fs/promises"
import path from "node:path"
import type { Tool } from "./types.js"

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

export const addTool: Tool = {
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

  async execute(rawArguments: string): Promise<string> {
    const args = parseJsonObject(rawArguments)

    if (typeof args.a !== "number" || !Number.isFinite(args.a)) {
      throw new Error("add argument 'a' must be a finite number")
    }

    if (typeof args.b !== "number" || !Number.isFinite(args.b)) {
      throw new Error("add argument 'b' must be a finite number")
    }

    return String(args.a + args.b)
  },
}

export const getCurrentTimeTool: Tool = {
  name: "get_current_time",
  description: "获取当前服务器时间，返回 ISO-8601 UTC 时间字符串。",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },

  async execute(rawArguments: string): Promise<string> {
    const args = parseJsonObject(rawArguments)

    if (Object.keys(args).length > 0) {
      throw new Error("get_current_time does not accept any arguments")
    }

    return new Date().toISOString()
  },
}

export const readFileTool: Tool = {
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

  async execute(rawArguments: string): Promise<string> {
    const args = parseJsonObject(rawArguments)

    if (typeof args.path !== "string" || args.path.trim().length === 0) {
      throw new Error("read_file argument 'path' must be a non-empty string")
    }

    const projectRoot = process.cwd()
    const absolutePath = path.resolve(projectRoot, args.path.trim())
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
  },
}

export const tools: Tool[] = [addTool, getCurrentTimeTool, readFileTool]
