import {
  access,
  appendFile,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { RecoveryStep, RunState } from "../03-run-state/run-state.js"
import { createRecoveryRuntime } from "./recovery-runtime.js"

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function readOrEmpty(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8")
  } catch {
    return ""
  }
}

function countLine(content: string, expected: string): number {
  return content
    .split("\n")
    .filter((line) => line.trim() === expected)
    .length
}

function printState(state: RunState) {
  console.log(`run status         : ${state.status}`)
  console.log(`current step       : ${state.currentStepId ?? "NONE"}`)

  for (const step of state.steps) {
    console.log(
      `- ${step.id} | ${step.status.padEnd(7)} | attempts=${step.attempts} | ${step.name}`,
    )
  }
}

const demoDir = await mkdtemp(join(tmpdir(), "yak-recovery-06-"))

console.log("========== Recovery 06 · Minimal Recovery Runtime ==========")
console.log("调用方只使用 run() / resume() / rollback()。")
console.log("Checkpoint、Run State、Retry、Resume、Rollback 的编排都收进 Runtime。")

try {
  // ---------------------------------------------------------------------------
  // Case A · run() → failed → resume() → success
  // ---------------------------------------------------------------------------
  console.log("\n========== Case A · Run → Resume ==========")

  const resumeAPath = join(demoDir, "resume-A.txt")
  const resumeBPath = join(demoDir, "resume-B.txt")
  const resumeReportPath = join(demoDir, "resume-report.txt")

  await writeFile(resumeAPath, "BASE-A\n", "utf8")
  await writeFile(resumeBPath, "BASE-B\n", "utf8")

  let testCanPass = false

  const resumeSteps: RecoveryStep[] = [
    {
      id: "step-01",
      name: "write A",
      maxAttempts: 1,
      async execute() {
        await appendFile(resumeAPath, "WRITE-A\n", "utf8")
      },
    },
    {
      id: "step-02",
      name: "write B",
      maxAttempts: 1,
      async execute() {
        await appendFile(resumeBPath, "WRITE-B\n", "utf8")
      },
    },
    {
      id: "step-03",
      name: "run test",
      maxAttempts: 2,
      async execute() {
        if (!testCanPass) {
          throw new Error("TEST-FAILED-BEFORE-RUNTIME-RESUME")
        }
      },
    },
    {
      id: "step-04",
      name: "write report",
      maxAttempts: 1,
      async execute() {
        await writeFile(resumeReportPath, "REPORT", "utf8")
      },
    },
  ]

  const resumeRuntime = createRecoveryRuntime({
    runId: "run-recovery-0601",
    steps: resumeSteps,
    snapshotFiles: [resumeAPath, resumeBPath],
  })

  const failedState = await resumeRuntime.run()
  const statusBeforeResume = failedState.status
  const failedStepBeforeResume = failedState.currentStepId

  console.log("\nAfter run():")
  printState(failedState)
  console.log(`checkpoint         : ${resumeRuntime.getCheckpoint()?.id}`)

  const aBeforeResume = countLine(await readOrEmpty(resumeAPath), "WRITE-A")
  const bBeforeResume = countLine(await readOrEmpty(resumeBPath), "WRITE-B")

  testCanPass = true
  const resumedState = await resumeRuntime.resume()

  const aAfterResume = countLine(await readOrEmpty(resumeAPath), "WRITE-A")
  const bAfterResume = countLine(await readOrEmpty(resumeBPath), "WRITE-B")

  console.log("\nAfter resume():")
  printState(resumedState)
  console.log(`A writes           : ${aAfterResume}`)
  console.log(`B writes           : ${bAfterResume}`)
  console.log(`report exists      : ${await exists(resumeReportPath)}`)

  if (
    statusBeforeResume !== "failed" ||
    failedStepBeforeResume !== "step-03" ||
    resumedState.status !== "success" ||
    aBeforeResume !== 1 ||
    bBeforeResume !== 1 ||
    aAfterResume !== 1 ||
    bAfterResume !== 1 ||
    !(await exists(resumeReportPath))
  ) {
    throw new Error("Recovery Runtime resume demo produced an unexpected result")
  }

  // ---------------------------------------------------------------------------
  // Case B · run() → failed → rollback()
  // ---------------------------------------------------------------------------
  console.log("\n========== Case B · Run → Rollback ==========")

  const rollbackAPath = join(demoDir, "rollback-A.txt")
  const rollbackBPath = join(demoDir, "rollback-B.txt")

  await writeFile(rollbackAPath, "OLD-A", "utf8")
  await writeFile(rollbackBPath, "OLD-B", "utf8")

  const rollbackSteps: RecoveryStep[] = [
    {
      id: "step-01",
      name: "update A",
      maxAttempts: 1,
      async execute() {
        await writeFile(rollbackAPath, "NEW-A", "utf8")
      },
    },
    {
      id: "step-02",
      name: "update B",
      maxAttempts: 1,
      async execute() {
        await writeFile(rollbackBPath, "NEW-B", "utf8")
      },
    },
    {
      id: "step-03",
      name: "run test",
      maxAttempts: 1,
      async execute() {
        throw new Error("TEST-FAILED-BEFORE-RUNTIME-ROLLBACK")
      },
    },
  ]

  const rollbackRuntime = createRecoveryRuntime({
    runId: "run-recovery-0602",
    steps: rollbackSteps,
    snapshotFiles: [rollbackAPath, rollbackBPath],
  })

  const rollbackFailedState = await rollbackRuntime.run()
  const beforeRollbackA = await readFile(rollbackAPath, "utf8")
  const beforeRollbackB = await readFile(rollbackBPath, "utf8")

  console.log("\nBefore rollback():")
  printState(rollbackFailedState)
  console.log(`current A          : ${beforeRollbackA}`)
  console.log(`current B          : ${beforeRollbackB}`)

  const rollbackResult = await rollbackRuntime.rollback()
  const afterRollbackA = await readFile(rollbackAPath, "utf8")
  const afterRollbackB = await readFile(rollbackBPath, "utf8")

  console.log("\nAfter rollback():")
  console.log(`rollback status    : ${rollbackResult.status}`)
  console.log(`checkpoint         : ${rollbackResult.checkpointId}`)
  console.log(`current A          : ${afterRollbackA}`)
  console.log(`current B          : ${afterRollbackB}`)
  console.log(`run status         : ${rollbackResult.runState.status}`)

  if (
    rollbackFailedState.status !== "failed" ||
    beforeRollbackA !== "NEW-A" ||
    beforeRollbackB !== "NEW-B" ||
    afterRollbackA !== "OLD-A" ||
    afterRollbackB !== "OLD-B" ||
    rollbackResult.runState.status !== "failed"
  ) {
    throw new Error("Recovery Runtime rollback demo produced an unexpected result")
  }

  console.log("\n========== 关键观察 ==========")
  console.log("run() 自动创建 Checkpoint + Run State，并在每个 Step 内使用 Retry。")
  console.log("resume() 读取失败的 Run State，跳过 success Step，从 failed Step 继续。")
  console.log("rollback() 使用 run() 开始前创建的 Checkpoint 恢复文件状态。")
  console.log("Agent 调用方不需要自己编排 retryOperation / createRunState / createCheckpoint / resumeRun / rollbackCheckpoint。")
  console.log("当前 Runtime 仍然只存在内存里，进程重启后的恢复暂时不进入。")
  console.log("01 = Failure；02 = Retry；03 = State；04 = Checkpoint；05 = Recover；06 = Runtime。")
  console.log("Recovery 阶段到这里封板。")
} finally {
  await rm(demoDir, { recursive: true, force: true })
  console.log(`\ncleanup            : removed ${demoDir}`)
}
