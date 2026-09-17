import type { ModelContext } from "../../05-context/06-minimal-context-runtime/types.js"

function messageText(message: ModelContext["messages"][number]): string {
  if (message.role === "assistant") {
    const toolCalls = message.tool_calls
      ? JSON.stringify(message.tool_calls)
      : ""
    return `${message.content ?? ""}${toolCalls}`
  }

  if (message.role === "tool") {
    return `${message.tool_call_id}${message.content}`
  }

  return message.content
}

export function estimateContextTokens(context: ModelContext): number {
  const characters = context.messages.reduce(
    (sum, message) => sum + messageText(message).length,
    0,
  )

  // 学习版近似估算：约 4 个字符算 1 token。
  // 这一轮只研究 Trigger，不研究 provider tokenizer 精度。
  return Math.ceil(characters / 4)
}

export function shouldCompact(
  estimatedTokens: number,
  tokenBudget: number,
): boolean {
  if (!Number.isFinite(estimatedTokens) || estimatedTokens < 0) {
    throw new Error(
      `estimatedTokens must be a non-negative number, received: ${estimatedTokens}`,
    )
  }

  if (!Number.isFinite(tokenBudget) || tokenBudget <= 0) {
    throw new Error(
      `tokenBudget must be a positive number, received: ${tokenBudget}`,
    )
  }

  return estimatedTokens > tokenBudget
}
