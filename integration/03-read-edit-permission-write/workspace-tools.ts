import { mkdir, readFile, writeFile } from "node:fs/promises"
import {
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path"
import type { Tool } from "../../mvp/02-tool/07-unified-tool-interface/types.js"
import {
  createLearningPolicy,
  type PermissionRule,
} from "../../mvp/07-permission/05-policy-precedence/policy-precedence.js"

function parseJsonObject(rawArguments: string): Record<string, unknown> {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawArguments)
  } catch {
    throw new Error(`Tool arguments are not valid JSON: ${rawArguments}`)
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Tool arguments must be a JSON object")
  }

  return parsed as Record<string, unknown>
}

function resolveInsideWorkspace(workspaceRoot: string, filePath: string): string {
  const normalizedRoot = resolve(workspaceRoot)
  const absolutePath = isAbsolute(filePath)
    ? resolve(filePath)
    : resolve(normalizedRoot, filePath)
  const relativePath = relative(normalizedRoot, absolutePath)

  const outside =
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)

  if (outside) {
    throw new Error(`Path is outside workspace: ${filePath}`)
  }

  return absolutePath
}

export function createWorkspaceReadFileTool(workspaceRoot: string): Tool {
  return {
    name: "read_file",
    description: "读取当前工作区中的 UTF-8 文本文件。修改文件前应先读取真实内容。",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "相对于工作区根目录的文件路径，例如 config.ts。",
        },
      },
      required: ["path"],
      additionalProperties: false,
    },

    async execute(rawArguments) {
      const args = parseJsonObject(rawArguments)

      if (typeof args.path !== "string" || !args.path.trim()) {
        throw new Error("read_file.path must be a non-empty string")
      }

      const absolutePath = resolveInsideWorkspace(workspaceRoot, args.path.trim())
      return readFile(absolutePath, "utf8")
    },
  }
}

export function createWorkspaceWriteFileTool(workspaceRoot: string): Tool {
  return {
    name: "write_file",
    description: "把完整 UTF-8 文本内容写入工作区文件。该操作会产生副作用，必须经过 Permission Runtime。",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "相对于工作区根目录的文件路径，例如 config.ts。",
        },
        content: {
          type: "string",
          description: "写入文件的完整文本内容，不要使用 Markdown 代码围栏。",
        },
      },
      required: ["path", "content"],
      additionalProperties: false,
    },

    async execute(rawArguments) {
      const args = parseJsonObject(rawArguments)

      if (typeof args.path !== "string" || !args.path.trim()) {
        throw new Error("write_file.path must be a non-empty string")
      }

      if (typeof args.content !== "string") {
        throw new Error("write_file.content must be a string")
      }

      const absolutePath = resolveInsideWorkspace(workspaceRoot, args.path.trim())
      await mkdir(dirname(absolutePath), { recursive: true })
      await writeFile(absolutePath, args.content, "utf8")

      return `wrote ${args.content.length} chars to ${absolutePath}`
    },
  }
}

export function createIntegrationPermissionRules(): PermissionRule[] {
  const outsideWorkspaceDeny: PermissionRule = {
    id: "workspace:outside",
    decision: "deny",
    reason: "resources outside workspace are never writable",
    matches(input) {
      const pathFromWorkspace = relative(
        input.workspaceRoot,
        input.resourcePath,
      )

      return (
        pathFromWorkspace === ".." ||
        pathFromWorkspace.startsWith(`..${sep}`) ||
        isAbsolute(pathFromWorkspace)
      )
    },
  }

  return [outsideWorkspaceDeny, ...createLearningPolicy()]
}
