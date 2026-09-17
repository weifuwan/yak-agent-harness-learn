import { writeFile } from "node:fs/promises"
import { retryOperation } from "../02-retry/retry.js"
import type {
  RecoveryStep,
  RunState,
} from "../03-run-state/run-state.js"
import type { RecoveryCheckpoint } from "../04-checkpoint-snapshot/checkpoint.js"

function validateSteps(steps: RecoveryStep[], state: RunState): void {
  if (steps.length !== state.steps.length) {
    throw new Error("RunState steps do not match RecoveryStep definitions")
  }

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]
    const stepState = state.steps[index]

    if (!step || !stepState || step.id !== stepState.id) {
      throw new Error(`RunState step mismatch at index ${index}`)
    }
  }
}

export async function resumeRun(
  steps: RecoveryStep[],
  state: RunState,
): Promise<RunState> {
  validateSteps(steps, state)

  if (state.status !== "failed") {
    throw new Error(
      `resumeRun requires a failed RunState, received: ${state.status}`,
    )
  }

  const resumeIndex = state.steps.findIndex(
    (step) => step.status === "failed",
  )

  if (resumeIndex < 0) {
    throw new Error("failed RunState has no failed Step to resume from")
  }

  state.status = "running"
  delete state.lastError

  for (let index = resumeIndex; index < steps.length; index += 1) {
    const step = steps[index]
    const stepState = state.steps[index]

    if (!step || !stepState) {
      throw new Error(`missing Step at index ${index}`)
    }

    // Resume 的核心：之前已经 success 的 Step 不再执行。
    if (stepState.status === "success") {
      continue
    }

    state.currentStepId = step.id
    stepState.status = "running"
    stepState.attempts = 0
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
      return state
    }

    stepState.status = "success"
  }

  state.status = "success"
  state.currentStepId = undefined
  state.lastError = undefined

  return state
}

export async function rollbackCheckpoint(
  checkpoint: RecoveryCheckpoint,
): Promise<void> {
  for (const snapshot of checkpoint.files) {
    await writeFile(snapshot.path, snapshot.content, "utf8")
  }
}
