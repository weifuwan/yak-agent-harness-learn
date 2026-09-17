import type {
  Tool,
  ToolCall,
} from "../01-no-permission/unrestricted-runtime.js"

export type PermissionDecision = "allow" | "ask" | "deny"
export type ApprovalDecision = "approve" | "reject"

export type PermissionPolicy = Record<string, PermissionDecision>

export type PermissionRequest = {
  id: string
  toolCall: ToolCall
  reason: string
}

export type PermissionStartResult =
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
  | {
      status: "approval_required"
      decision: "ask"
      request: PermissionRequest
    }

export type ApprovalResolutionResult =
  | {
      status: "executed"
      approval: "approve"
      toolResult: string
    }
  | {
      status: "blocked"
      approval: "reject"
      reason: string
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

export function checkPermission(
  toolCall: ToolCall,
  policy: PermissionPolicy,
): PermissionDecision {
  return policy[toolCall.function.name] ?? "deny"
}

export async function startToolCallWithPermission(
  toolCall: ToolCall,
  tools: Tool[],
  policy: PermissionPolicy,
): Promise<PermissionStartResult> {
  const decision = checkPermission(toolCall, policy)

  if (decision === "deny") {
    return {
      status: "blocked",
      decision: "deny",
      reason: `${toolCall.function.name} is denied by permission policy`,
    }
  }

  if (decision === "ask") {
    // ask 的关键：此时绝对不执行 Tool，只产生一个待外部批准的请求。
    return {
      status: "approval_required",
      decision: "ask",
      request: {
        id: `approval:${toolCall.id}`,
        toolCall,
        reason: `${toolCall.function.name} requires external approval`,
      },
    }
  }

  const tool = findTool(toolCall, tools)

  return {
    status: "executed",
    decision: "allow",
    toolResult: await tool.execute(toolCall.function.arguments),
  }
}

export async function resumeToolCallAfterApproval(
  request: PermissionRequest,
  approval: ApprovalDecision,
  tools: Tool[],
): Promise<ApprovalResolutionResult> {
  // Approval 是外部输入，不由模型自己生成。
  if (approval === "reject") {
    return {
      status: "blocked",
      approval: "reject",
      reason: `approval request ${request.id} was rejected`,
    }
  }

  const tool = findTool(request.toolCall, tools)

  return {
    status: "executed",
    approval: "approve",
    toolResult: await tool.execute(request.toolCall.function.arguments),
  }
}
