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

export function createInitialLoopState(options: {
  maxSteps: number
  systemPrompt: string
  userPrompt: string
}): LoopState {
  return {
    step: 0,
    maxSteps: options.maxSteps,
    messages: [
      {
        role: "system",
        content: options.systemPrompt,
      },
      {
        role: "user",
        content: options.userPrompt,
      },
    ],
  }
}
