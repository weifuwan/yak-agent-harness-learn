import { retryOperation } from "../02-retry/retry.js"

export type RunStatus = "pending" | "running" | "success" | "failed"
export type StepStatus = "pending" | "running" | "success" | "failed"

export type RecoveryStep = {
  id: string
  name: string
  maxAttempts: number
  execute(attempt: number): Promise<void>
}

export type StepState = {
  id: string
  name: string
  status: StepStatus
  attempts: number
  lastError?: string
}

export type RunState = {
  runId: string
  status: RunStatus
  currentStepId?: string
  lastError?: string
  steps: StepState[]
}

export function createRunState(
  runId: string,
  steps: RecoveryStep[],
): RunState {
  return {
    runId,
    status: "pending",
    steps: steps.map((step) => ({
      id: step.id,
      name: step.name,
      status: "pending",
      attempts: 0,
    })),
  }
}

export async function runWithState(
  steps: RecoveryStep[],
  state: RunState,
): Promise<RunState> {
  if (steps.length !== state.steps.length) {
    throw new Error("RunState steps do not match RecoveryStep definitions")
  }

  state.status = "running"

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]
    const stepState = state.steps[index]

    if (!step || !stepState || step.id !== stepState.id) {
      throw new Error(`RunState step mismatch at index ${index}`)
    }

    state.currentStepId = step.id
    stepState.status = "running"
    delete stepState.lastError

    const result = await retryOperation(
      async (attempt) => {
        stepState.attempts = attempt
        await step.execute(attempt)
      },
      { maxAttempts: step.maxAttempts },
    )

    if (result.status === "failed") {
      stepState.status = "failed"
      stepState.lastError = result.error.message
      state.status = "failed"
      state.lastError = result.error.message

      // recovery:03 到这里就停。
      // 我们已经知道失败在哪，但还不会 Resume，也没有 Snapshot 可以 Rollback。
      return state
    }

    stepState.status = "success"
  }

  state.status = "success"
  state.currentStepId = undefined
  state.lastError = undefined

  return state
}
