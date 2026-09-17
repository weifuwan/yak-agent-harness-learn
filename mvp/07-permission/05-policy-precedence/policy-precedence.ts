import { basename, isAbsolute, relative, resolve, sep } from "node:path"
import type {
  Tool,
  ToolCall,
} from "../01-no-permission/unrestricted-runtime.js"

export type PermissionDecision = "allow" | "ask" | "deny"

export type PermissionInput = {
  toolCall: ToolCall
  workspaceRoot: string
  resourcePath: string
  relativePath: string
}

export type PermissionRule = {
  id: string
  decision: PermissionDecision
  reason: string
  matches(input: PermissionInput): boolean
}

export type MatchedRule = {
  id: string
  decision: PermissionDecision
  reason: string
}

export type PolicyResolution = {
  decision: PermissionDecision
  matchedRules: MatchedRule[]
  workspaceRoot: string
  resourcePath: string
  relativePath: string
  reason: string
}

export type PolicyExecutionResult =
  | {
      status: "executed"
      decision: "allow"
      matchedRules: MatchedRule[]
      resourcePath: string
      toolResult: string
    }
  | {
      status: "approval_required"
      decision: "ask"
      matchedRules: MatchedRule[]
      resourcePath: string
      reason: string
    }
  | {
      status: "blocked"
      decision: "deny"
      matchedRules: MatchedRule[]
      resourcePath: string
      reason: string
    }

type PathArguments = Record<string, unknown> & {
  path: string
}

const DECISION_PRIORITY: Record<PermissionDecision, number> = {
  allow: 1,
  ask: 2,
  deny: 3,
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

export function buildPermissionInput(
  toolCall: ToolCall,
  workspaceRoot: string,
): PermissionInput {
  const args = parsePathArguments(toolCall)
  const normalizedWorkspaceRoot = resolve(workspaceRoot)
  const normalizedResourcePath = isAbsolute(args.path)
    ? resolve(args.path)
    : resolve(normalizedWorkspaceRoot, args.path)
  const relativePath = relative(
    normalizedWorkspaceRoot,
    normalizedResourcePath,
  )

  return {
    toolCall,
    workspaceRoot: normalizedWorkspaceRoot,
    resourcePath: normalizedResourcePath,
    relativePath: relativePath || ".",
  }
}

export function createLearningPolicy(): PermissionRule[] {
  return [
    {
      id: "workspace:inside",
      decision: "allow",
      reason: "resource is inside workspace",
      matches(input) {
        return isInsideWorkspace(input.workspaceRoot, input.resourcePath)
      },
    },
    {
      id: "tool:write_file",
      decision: "ask",
      reason: "write_file requires approval",
      matches(input) {
        return input.toolCall.function.name === "write_file"
      },
    },
    {
      id: "path:.env",
      decision: "deny",
      reason: ".env is protected by the learning policy",
      matches(input) {
        return basename(input.resourcePath).toLowerCase() === ".env"
      },
    },
  ]
}

export function matchRules(
  input: PermissionInput,
  rules: PermissionRule[],
): MatchedRule[] {
  return rules
    .filter((rule) => rule.matches(input))
    .map((rule) => ({
      id: rule.id,
      decision: rule.decision,
      reason: rule.reason,
    }))
}

export function resolveDecision(
  matchedRules: MatchedRule[],
): PermissionDecision {
  // 当前学习版人为规定：deny > ask > allow。
  // 这不是唯一正确的真实世界策略，只是为了先理解 Rule 冲突如何收敛成一个 Decision。
  if (matchedRules.length === 0) {
    return "deny"
  }

  return matchedRules.reduce<PermissionDecision>((current, rule) => {
    return DECISION_PRIORITY[rule.decision] > DECISION_PRIORITY[current]
      ? rule.decision
      : current
  }, "allow")
}

export function resolvePolicy(options: {
  toolCall: ToolCall
  workspaceRoot: string
  rules: PermissionRule[]
}): PolicyResolution {
  const input = buildPermissionInput(options.toolCall, options.workspaceRoot)
  const matchedRules = matchRules(input, options.rules)
  const decision = resolveDecision(matchedRules)

  return {
    decision,
    matchedRules,
    workspaceRoot: input.workspaceRoot,
    resourcePath: input.resourcePath,
    relativePath: input.relativePath,
    reason:
      matchedRules.length === 0
        ? "no permission rule matched; default deny"
        : `resolved ${matchedRules.length} matched rule(s) with deny > ask > allow`,
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

export async function executeToolCallWithPolicy(options: {
  toolCall: ToolCall
  tools: Tool[]
  workspaceRoot: string
  rules: PermissionRule[]
}): Promise<PolicyExecutionResult> {
  const resolution = resolvePolicy({
    toolCall: options.toolCall,
    workspaceRoot: options.workspaceRoot,
    rules: options.rules,
  })

  if (resolution.decision === "deny") {
    return {
      status: "blocked",
      decision: "deny",
      matchedRules: resolution.matchedRules,
      resourcePath: resolution.resourcePath,
      reason: resolution.reason,
    }
  }

  if (resolution.decision === "ask") {
    return {
      status: "approval_required",
      decision: "ask",
      matchedRules: resolution.matchedRules,
      resourcePath: resolution.resourcePath,
      reason: resolution.reason,
    }
  }

  const tool = findTool(options.toolCall, options.tools)
  const args = parsePathArguments(options.toolCall)

  const normalizedArguments = JSON.stringify({
    ...args,
    path: resolution.resourcePath,
  })

  return {
    status: "executed",
    decision: "allow",
    matchedRules: resolution.matchedRules,
    resourcePath: resolution.resourcePath,
    toolResult: await tool.execute(normalizedArguments),
  }
}
