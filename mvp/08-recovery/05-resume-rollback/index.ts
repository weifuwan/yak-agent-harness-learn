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
import {
  createRunState,
  runWithState,
  type RecoveryStep,
  type RunState,
} from "../03-run-state/run-state.js"
import { createCheckpoint } from "../04-checkpoint-snapshot/checkpoint.js"
import {
  resumeRun,
  rollbackCheckpoint,
} from "./recover.js"

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

const demoDir = await mkdtemp(join(tmpdir(), "yak-recovery-05-"))

console.log("========== Recovery 05 · Resume / Rollback ==========")
console.log("Resume = 从失败点继续；Rollback = 用 Checkpoint 恢复旧状态。")

try {
  // ---------------------------------------------------------------------------
  // Case A · Resume
  // ---------------------------------------------------------------------------
  console.log("\n========== Case A · Resume ==========")

  const resumeAPath = join(demoDir, "resume-A.txt")
  const resumeBPath = join(demoDir, "resume-B.txt")
  const resumeReportPath = join(demoDir, "resume-report.txt")
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
      maxAttempts: 1,
      async execute() {
        if (!testCanPass) {
          throw new Error("TEST-FAILED-BEFORE-RESUME")
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

  const resumeState = createRunState("run-recovery-0501", resumeSteps)
  await runWithState(resumeSteps, resumeState)

  console.log("\nBefore Resume:")
  printState(resumeState)

  const aBeforeResume = countLine(
    await readOrEmpty(resumeAPath),
    "WRITE-A",
  )
  const bBeforeResume = countLine(
    await readOrEmpty(resumeBPath),
    "WRITE-B",
  )

  console.log(`A writes before    : ${aBeforeResume}`)
  console.log(`B writes before    : ${bBeforeResume}`)
  console.log(`report exists      : ${await exists(resumeReportPath)}`)

  // 外部条件修复：失败的测试现在可以通过。
  testCanPass = true
  await resumeRun(resumeSteps, resumeState)

  const aAfterResume = countLine(
    await readOrEmpty(resumeAPath),
    "WRITE-A",
  )
  const bAfterResume = countLine(
    await readOrEmpty(resumeBPath),
    "WRITE-B",
  )

  console.log("\nAfter Resume:")
  printState(resumeState)
  console.log(`A writes after     : ${aAfterResume}`)
  console.log(`B writes after     : ${bAfterResume}`)
  console.log(`report exists      : ${await exists(resumeReportPath)}`)

  const resumeWorked =
    resumeState.status === "success" &&
    resumeState.steps.every((step) => step.status === "success") &&
    aBeforeResume === 1 &&
    bBeforeResume === 1 &&
    aAfterResume === 1 &&
    bAfterResume === 1 &&
    (await exists(resumeReportPath))

  if (!resumeWorked) {
    throw new Error("Resume demo produced an unexpected result")
  }

  // ---------------------------------------------------------------------------
  // Case B · Rollback
  // ---------------------------------------------------------------------------
  console.log("\n========== Case B · Rollback ==========")

  const rollbackAPath = join(demoDir, "rollback-A.txt")
  const rollbackBPath = join(demoDir, "rollback-B.txt")
  const rollbackReportPath = join(demoDir, "rollback-report.txt")

  await writeFile(rollbackAPath, "OLD-A", "utf8")
  await writeFile(rollbackBPath, "OLD-B", "utf8")

  const checkpoint = await createCheckpoint(
    "checkpoint-recovery-0501",
    [rollbackAPath, rollbackBPath],
  )

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
        throw new Error("TEST-FAILED-BEFORE-ROLLBACK")
      },
    },
    {
      id: "step-04",
      name: "write report",
      maxAttempts: 1,
      async execute() {
        await writeFile(rollbackReportPath, "REPORT", "utf8")
      },
    },
  ]

  const rollbackState = createRunState(
    "run-recovery-0502",
    rollbackSteps,
  )
  await runWithState(rollbackSteps, rollbackState)

  const currentABefore = await readFile(rollbackAPath, "utf8")
  const currentBBefore = await readFile(rollbackBPath, "utf8")

  console.log("\nBefore Rollback:")
  printState(rollbackState)
  console.log(`current A           : ${currentABefore}`)
  console.log(`current B           : ${currentBBefore}`)

  await rollbackCheckpoint(checkpoint)

  const currentAAfter = await readFile(rollbackAPath, "utf8")
  const currentBAfter = await readFile(rollbackBPath, "utf8")

  console.log("\nAfter Rollback:")
  console.log(`current A           : ${currentAAfter}`)
  console.log(`current B           : ${currentBAfter}`)
  console.log(`report exists       : ${await exists(rollbackReportPath)}`)
  console.log(`run status          : ${rollbackState.status}`)

  const rollbackWorked =
    rollbackState.status === "failed" &&
    currentABefore === "NEW-A" &&
    currentBBefore === "NEW-B" &&
    currentAAfter === "OLD-A" &&
    currentBAfter === "OLD-B" &&
    !(await exists(rollbackReportPath))

  if (!rollbackWorked) {
    throw new Error("Rollback demo produced an unexpected result")
  }

  console.log("\n========== 关键观察 ==========")
  console.log("Resume 读取 Run State，跳过已经 success 的 Step 1 / 2，从 failed Step 3 继续。")
  console.log("所以 Resume 后 A / B 没有被重复写，Step 4 才继续执行。")
  console.log("Rollback 不继续 Run，而是使用 Checkpoint 把 NEW-A / NEW-B 恢复成 OLD-A / OLD-B。")
  console.log("Retry = 同一步再试；Resume = 从失败点往前继续；Rollback = 回到安全状态。")
  console.log("Rollback 恢复了文件世界，但当前学习版没有把 failed Run 改写成 success。")
  console.log("01 = Failure；02 = Retry；03 = State；04 = Checkpoint；05 = Recover。")
  console.log("下一节 recovery:06 会把 Retry / State / Checkpoint / Resume / Rollback 收进统一 Recovery Runtime。")
} finally {
  await rm(demoDir, { recursive: true, force: true })
  console.log(`\ncleanup             : removed ${demoDir}`)
}
