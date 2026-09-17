import type {
  Tool,
  ToolCall,
} from "../01-no-permission/unrestricted-runtime.js"

export type PermissionDecision = "allow" | "deny"

export type PermissionPolicy = Record<string, PermissionDecision>

export type PermissionCheck = {
  decision: PermissionDecision
  toolName: string
  reason: string
}

export type PermissionExecutionResult =
  | {
      status: "executed"
      decision: "allow"
      toolResult: string
    }
  | {
      status: "blocked"
      decision: "deny"
      reason: string
    }

export function checkPermission(
  toolCall: ToolCall,
  policy: PermissionPolicy,
): PermissionCheck {
  const toolName = toolCall.function.name
  const decision = policy[toolName] ?? "deny"

  return {
    decision,
    toolName,
    reason:
      policy[toolName] === undefined
        ? `no permission rule for ${toolName}; default deny`
        : `${toolName} is configured as ${decision}`,
  }
}

export async function executeToolCallWithPermission(
  toolCall: ToolCall,
  tools: Tool[],
  policy: PermissionPolicy,
): Promise<PermissionExecutionResult> {
  // permission:02 第一次在 Tool Call 和 Tool Execution 中间插入 Gate。
  const permission = checkPermission(toolCall, policy)

  if (permission.decision === "deny") {
    return {
      status: "blocked",
      decision: "deny",
      reason: permission.reason,
    }
  }

  const tool = tools.find(
    (candidate) => candidate.name === toolCall.function.name,
  )

  if (!tool) {
    throw new Error(`Unknown tool: ${toolCall.function.name}`)
  }

  return {
    status: "executed",
    decision: "allow",
    toolResult: await tool.execute(toolCall.function.arguments),
  }
}
