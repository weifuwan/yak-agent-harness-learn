import type {
  RecoveryStep,
  RunState,
} from "../03-run-state/run-state.js"
import {
  createRunState,
  runWithState,
} from "../03-run-state/run-state.js"
import {
  createCheckpoint,
  type RecoveryCheckpoint,
} from "../04-checkpoint-snapshot/checkpoint.js"
import {
  resumeRun,
  rollbackCheckpoint,
} from "../05-resume-rollback/recover.js"

export type CreateRecoveryRuntimeOptions = {
  runId: string
  steps: RecoveryStep[]
  snapshotFiles: string[]
}

export type RollbackResult = {
  status: "rolled_back"
  runState: RunState
  checkpointId: string
}

export type RecoveryRuntime = {
  run(): Promise<RunState>
  resume(): Promise<RunState>
  rollback(): Promise<RollbackResult>
  getState(): RunState | undefined
  getCheckpoint(): RecoveryCheckpoint | undefined
}

export function createRecoveryRuntime(
  options: CreateRecoveryRuntimeOptions,
): RecoveryRuntime {
  if (!options.runId.trim()) {
    throw new Error("runId must not be empty")
  }

  if (options.steps.length === 0) {
    throw new Error("Recovery Runtime requires at least one Step")
  }

  if (options.snapshotFiles.length === 0) {
    throw new Error("Recovery Runtime requires at least one snapshot file")
  }

  let state: RunState | undefined
  let checkpoint: RecoveryCheckpoint | undefined

  return {
    async run() {
      // recovery:06 的收口点：调用方不再自己编排 Checkpoint + Run State。
      checkpoint = await createCheckpoint(
        `checkpoint:${options.runId}`,
        options.snapshotFiles,
      )
      state = createRunState(options.runId, options.steps)

      return runWithState(options.steps, state)
    },

    async resume() {
      if (!state) {
        throw new Error("Recovery Runtime has no Run State. Call run() first.")
      }

      // Retry / failed Step / 跳过 success Step 的细节隐藏在 resumeRun() 内。
      return resumeRun(options.steps, state)
    },

    async rollback() {
      if (!state) {
        throw new Error("Recovery Runtime has no Run State. Call run() first.")
      }

      if (!checkpoint) {
        throw new Error("Recovery Runtime has no Checkpoint. Call run() first.")
      }

      if (state.status !== "failed") {
        throw new Error(
          `rollback() requires a failed Run State, received: ${state.status}`,
        )
      }

      // Rollback 只恢复世界状态，不把原本 failed 的 Run 伪造成 success。
      await rollbackCheckpoint(checkpoint)

      return {
        status: "rolled_back",
        runState: state,
        checkpointId: checkpoint.id,
      }
    },

    getState() {
      return state
    },

    getCheckpoint() {
      return checkpoint
    },
  }
}
