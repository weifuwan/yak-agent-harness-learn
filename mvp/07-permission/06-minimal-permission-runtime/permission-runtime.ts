import type {
  Tool,
  ToolCall,
} from "../01-no-permission/unrestricted-runtime.js"
import {
  resolvePolicy,
  type MatchedRule,
  type PermissionRule,
} from "../05-policy-precedence/policy-precedence.js"

export type ApprovalDecision = "approve" | "reject"

export type PermissionApprovalRequest = {
  id: string
  toolCall: ToolCall
  resourcePath: string
  normalizedArguments: string
  matchedRules: MatchedRule[]
}

export type PermissionRuntimeStartResult =
  | {
      status: "executed"
      decision: "allow"
      resourcePath: string
      matchedRules: MatchedRule[]
      toolResult: string
    }
  | {
      status: "approval_required"
      decision: "ask"
      resourcePath: string
      matchedRules: MatchedRule[]
      request: PermissionApprovalRequest
    }
  | {
      status: "blocked"
      decision: "deny"
      resourcePath: string
      matchedRules: MatchedRule[]
      reason: string
    }

export type PermissionRuntimeResumeResult =
  | {
      status: "executed"
      approval: "approve"
      resourcePath: string
      toolResult: string
    }
  | {
      status: "blocked"
      approval: "reject"
      resourcePath: string
      reason: string
    }

export type PermissionRuntime = {
  start(toolCall: ToolCall): Promise<PermissionRuntimeStartResult>
  resume(
    request: PermissionApprovalRequest,
    approval: ApprovalDecision,
  ): Promise<PermissionRuntimeResumeResult>
}

export type CreatePermissionRuntimeOptions = {
  tools: Tool[]
  workspaceRoot: string
  rules: PermissionRule[]
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

function normalizeArguments(
  toolCall: ToolCall,
  resourcePath: string,
): string {
  let value: unknown

  try {
    value = JSON.parse(toolCall.function.arguments)
  } catch {
    throw new Error(`${toolCall.function.name} arguments must be valid JSON`)
  }

  if (!value || typeof value !== "object") {
    throw new Error(`${toolCall.function.name} arguments must be an object`)
  }

  const args = value as Record<string, unknown>

  if (typeof args.path !== "string" || !args.path.trim()) {
    throw new Error(`${toolCall.function.name}.path must be a non-empty string`)
  }

  return JSON.stringify({
    ...args,
    path: resourcePath,
  })
}

export function createPermissionRuntime(
  options: CreatePermissionRuntimeOptions,
): PermissionRuntime {
  return {
    async start(toolCall) {
      // Runtime 先确认这是一个真实存在的 Tool，但此时还不执行。
      const tool = findTool(toolCall, options.tools)

      // Scope / Rule Match / Precedence 都隐藏在 resolvePolicy() 里面。
      const resolution = resolvePolicy({
        toolCall,
        workspaceRoot: options.workspaceRoot,
        rules: options.rules,
      })

      const normalizedArguments = normalizeArguments(
        toolCall,
        resolution.resourcePath,
      )

      if (resolution.decision === "deny") {
        return {
          status: "blocked",
          decision: "deny",
          resourcePath: resolution.resourcePath,
          matchedRules: resolution.matchedRules,
          reason: resolution.reason,
        }
      }

      if (resolution.decision === "ask") {
        // ask 的关键：这里只创建 Approval Request，不执行 Tool。
        return {
          status: "approval_required",
          decision: "ask",
          resourcePath: resolution.resourcePath,
          matchedRules: resolution.matchedRules,
          request: {
            id: `approval:${toolCall.id}`,
            toolCall,
            resourcePath: resolution.resourcePath,
            normalizedArguments,
            matchedRules: [...resolution.matchedRules],
          },
        }
      }

      return {
        status: "executed",
        decision: "allow",
        resourcePath: resolution.resourcePath,
        matchedRules: resolution.matchedRules,
        toolResult: await tool.execute(normalizedArguments),
      }
    },

    async resume(request, approval) {
      // Approval 是外部输入；reject 永远不能产生副作用。
      if (approval === "reject") {
        return {
          status: "blocked",
          approval: "reject",
          resourcePath: request.resourcePath,
          reason: `approval request ${request.id} was rejected`,
        }
      }

      const tool = findTool(request.toolCall, options.tools)

      return {
        status: "executed",
        approval: "approve",
        resourcePath: request.resourcePath,
        toolResult: await tool.execute(request.normalizedArguments),
      }
    },
  }
}
