import { isAbsolute, relative, resolve, sep } from "node:path"
import type {
  Tool,
  ToolCall,
} from "../01-no-permission/unrestricted-runtime.js"

export type ResourceScopeDecision = "allow" | "deny"

export type ResourceScopeCheck = {
  decision: ResourceScopeDecision
  toolName: string
  workspaceRoot: string
  resourcePath: string
  relativePath: string
  reason: string
}

export type ScopedExecutionResult =
  | {
      status: "executed"
      decision: "allow"
      resourcePath: string
      toolResult: string
    }
  | {
      status: "blocked"
      decision: "deny"
      resourcePath: string
      reason: string
    }

type PathArguments = Record<string, unknown> & {
  path: string
}

function parsePathArguments(toolCall: ToolCall): PathArguments {
  let value: unknown

  try {
    value = JSON.parse(toolCall.function.arguments)
  } catch {
    throw new Error(`${toolCall.function.name} arguments must be valid JSON`)
  }

  if (!value || typeof value !== "object") {
    throw new Error(`${toolCall.function.name} arguments must be an object`)
  }

  const candidate = value as Record<string, unknown>

  if (typeof candidate.path !== "string" || !candidate.path.trim()) {
    throw new Error(`${toolCall.function.name}.path must be a non-empty string`)
  }

  return candidate as PathArguments
}

function isInsideWorkspace(
  workspaceRoot: string,
  resourcePath: string,
): boolean {
  const pathFromWorkspace = relative(workspaceRoot, resourcePath)

  return (
    pathFromWorkspace === "" ||
    (
      pathFromWorkspace !== ".." &&
      !pathFromWorkspace.startsWith(`..${sep}`) &&
      !isAbsolute(pathFromWorkspace)
    )
  )
}

export function checkResourceScope(
  toolCall: ToolCall,
  workspaceRoot: string,
): ResourceScopeCheck {
  const args = parsePathArguments(toolCall)
  const normalizedWorkspaceRoot = resolve(workspaceRoot)
  const normalizedResourcePath = isAbsolute(args.path)
    ? resolve(args.path)
    : resolve(normalizedWorkspaceRoot, args.path)
  const relativePath = relative(
    normalizedWorkspaceRoot,
    normalizedResourcePath,
  )
  const insideWorkspace = isInsideWorkspace(
    normalizedWorkspaceRoot,
    normalizedResourcePath,
  )

  return {
    decision: insideWorkspace ? "allow" : "deny",
    toolName: toolCall.function.name,
    workspaceRoot: normalizedWorkspaceRoot,
    resourcePath: normalizedResourcePath,
    relativePath: relativePath || ".",
    reason: insideWorkspace
      ? "resource is inside workspace"
      : "resource is outside workspace",
  }
}

function findTool(toolCall: ToolCall, tools: Tool[]): Tool {
  const tool = tools.find(
    (candidate) => candidate.name === toolCall.function.name,
  )

  if (!tool) {
    throw new Error(`Unknown tool: ${toolCall.function.name}`)
  }

  return tool
}

export async function executeToolCallWithResourceScope(
  toolCall: ToolCall,
  tools: Tool[],
  workspaceRoot: string,
): Promise<ScopedExecutionResult> {
  const scope = checkResourceScope(toolCall, workspaceRoot)

  if (scope.decision === "deny") {
    return {
      status: "blocked",
      decision: "deny",
      resourcePath: scope.resourcePath,
      reason: scope.reason,
    }
  }

  const tool = findTool(toolCall, tools)
  const args = parsePathArguments(toolCall)

  // Scope 判断和真正执行必须使用同一个规范化路径。
  // 否则 Permission 检查的是 A，Tool 却可能因为相对路径从另一个 cwd 操作 B。
  const normalizedArguments = JSON.stringify({
    ...args,
    path: scope.resourcePath,
  })

  return {
    status: "executed",
    decision: "allow",
    resourcePath: scope.resourcePath,
    toolResult: await tool.execute(normalizedArguments),
  }
}
