import type { Tool } from "../../02-tool/07-unified-tool-interface/types.js"

export type AgentRunResult =
  | {
      status: "done"
      reason: "final_answer"
      steps: number
      content: string
    }
  | {
      status: "stopped"
      reason: "max_steps"
      steps: number
    }

export type LoopState = {
  step: number
  maxSteps: number
  messages: Array<Record<string, unknown>>
  result?: AgentRunResult
}

export type RunAgentOptions = {
  prompt: string
  tools: Tool[]
  maxSteps: number
  systemPrompt?: string
}
