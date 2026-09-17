import type { SessionMessage } from "../../05-context/06-minimal-context-runtime/types.js"
import type { ContextUnit } from "../03-hot-cold-context/hot-cold.js"

export type CompactedColdContext = {
  summary: string
  sourceUnits: number
  sourceMessages: number
}

type SummarizeColdOptions = {
  coldUnits: ContextUnit[]
  apiKey: string
  baseUrl: string
  model: string
}

function renderMessage(message: SessionMessage): string {
  if (message.role === "assistant" && message.tool_calls?.length) {
    return [
      "assistant(tool_call):",
      JSON.stringify(message.tool_calls),
      message.content ?? "",
    ]
      .filter(Boolean)
      .join("\n")
  }

  if (message.role === "tool") {
    return `tool(${message.tool_call_id}): ${message.content}`
  }

  return `${message.role}: ${message.content ?? ""}`
}

export function renderColdUnits(units: ContextUnit[]): string {
  return units
    .map((unit, index) => {
      const body = unit.messages.map(renderMessage).join("\n")
      return `[Cold Unit ${index + 1}]\n${body}`
    })
    .join("\n\n")
}

export function estimateTextTokens(text: string): number {
  // 继续沿用学习版近似估算，约 4 个字符算 1 token。
  return Math.ceil(text.length / 4)
}

export async function summarizeColdUnits(
  options: SummarizeColdOptions,
): Promise<CompactedColdContext> {
  if (options.coldUnits.length === 0) {
    throw new Error("summarizeColdUnits requires at least one Cold Unit")
  }

  const sourceText = renderColdUnits(options.coldUnits)

  const response = await fetch(`${options.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      stream: false,
      messages: [
        {
          role: "system",
          content: [
            "你负责把 Agent 的较旧 Cold Context 压缩成更短的继续执行摘要。",
            "只保留后续继续任务仍可能需要的事实，不要复述过程性废话。",
            "必须保留：用户约束、已经做出的决定、重要工具结果、未完成事项、明确的标识符和代码。",
            "任何形如 IMPORTANT-、FACT-、UNIT- 的标识符都必须原样保留，不得改写。",
            "输出简洁项目符号，不要写开场白。",
          ].join("\n"),
        },
        {
          role: "user",
          content: `[Cold Context]\n${sourceText}`,
        },
      ],
    }),
  })

  const rawBody = await response.text()
  if (!response.ok) {
    throw new Error(`Model HTTP ${response.status}: ${rawBody}`)
  }

  const payload = JSON.parse(rawBody) as {
    choices?: Array<{
      message?: {
        content?: string | null
      }
    }>
  }

  const summary = payload.choices?.[0]?.message?.content?.trim()
  if (!summary) {
    throw new Error("Compaction model returned no summary")
  }

  return {
    summary,
    sourceUnits: options.coldUnits.length,
    sourceMessages: options.coldUnits.reduce(
      (sum, unit) => sum + unit.messages.length,
      0,
    ),
  }
}
