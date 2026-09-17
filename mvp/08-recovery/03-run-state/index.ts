import { access, appendFile, mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  createRunState,
  runWithState,
  type RecoveryStep,
  type RunState,
} from "./run-state.js"

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

function printRunState(state: RunState) {
  console.log(`run id             : ${state.runId}`)
  console.log(`run status         : ${state.status}`)
  console.log(`current step       : ${state.currentStepId ?? "NONE"}`)
  console.log(`last error         : ${state.lastError ?? "NONE"}`)
  console.log("")
  console.log("steps:")

  for (const step of state.steps) {
    console.log(
      `- ${step.id} | ${step.status.padEnd(7)} | attempts=${step.attempts} | ${step.name}`,
    )

    if (step.lastError) {
      console.log(`  error: ${step.lastError}`)
    }
  }
}

const demoDir = await mkdtemp(join(tmpdir(), "yak-recovery-03-"))
const aPath = join(demoDir, "A.txt")
const bPath = join(demoDir, "B.txt")
const reportPath = join(demoDir, "report.txt")

const steps: RecoveryStep[] = [
  {
    id: "step-01",
    name: "write A",
    maxAttempts: 1,
    async execute() {
      console.log("step-01 execute     : write A")
      await appendFile(aPath, "WRITE-A\n", "utf8")
    },
  },
  {
    id: "step-02",
    name: "write B",
    maxAttempts: 1,
    async execute() {
      console.log("step-02 execute     : write B")
      await appendFile(bPath, "WRITE-B\n", "utf8")
    },
  },
  {
    id: "step-03",
    name: "run test",
    maxAttempts: 2,
    async execute(attempt) {
      console.log(`step-03 execute     : test attempt ${attempt}`)
      throw new Error(`TEST-FAILED-ATTEMPT-${attempt}`)
    },
  },
  {
    id: "step-04",
    name: "write report",
    maxAttempts: 1,
    async execute() {
      console.log("step-04 execute     : write report")
      await appendFile(reportPath, "REPORT\n", "utf8")
    },
  },
]

console.log("========== Recovery 03 · Run State ==========")
console.log("Retry 仍然只负责当前 Step；这一轮第一次记录整个 Run 做到哪里。")
console.log("Run State 当前只保存在内存里，不做持久化、Resume、Snapshot 或 Rollback。")

try {
  const state = createRunState("run-recovery-0301", steps)

  console.log("\n========== Before Run ==========")
  printRunState(state)

  await runWithState(steps, state)

  console.log("\n========== After Failure ==========")
  printRunState(state)

  console.log("\n========== Side Effects ==========")
  console.log(`A exists           : ${await exists(aPath)}`)
  console.log(`B exists           : ${await exists(bPath)}`)
  console.log(`report exists      : ${await exists(reportPath)}`)
  console.log(`A content          : ${(await readOrEmpty(aPath)).trim() || "(empty)"}`)
  console.log(`B content          : ${(await readOrEmpty(bPath)).trim() || "(empty)"}`)

  const [step1, step2, step3, step4] = state.steps

  if (
    state.status !== "failed" ||
    state.currentStepId !== "step-03" ||
    step1?.status !== "success" ||
    step2?.status !== "success" ||
    step3?.status !== "failed" ||
    step3.attempts !== 2 ||
    step4?.status !== "pending" ||
    (await exists(reportPath))
  ) {
    throw new Error("Run State demo produced an unexpected result")
  }

  console.log("\n========== 关键观察 ==========")
  console.log("Retry 让 Step 3 在当前步骤内尝试了 2 次，但最终仍然失败。")
  console.log("Run State 记录了 Step 1 / Step 2 已成功，Step 3 失败，Step 4 尚未执行。")
  console.log("所以 Runtime 第一次能回答：做到哪一步、哪些成功、哪些失败、哪些还没跑。")
  console.log("但这一轮还不会根据 Run State 自动 Resume，也没有 Snapshot 可以 Rollback。")
  console.log("当前 Run State 只是内存对象，进程退出后仍然会丢失。")
  console.log("01 = Failure；02 = Retry；03 = State。")
  console.log("下一节 recovery:04 才研究 Checkpoint / Snapshot：失败时如何知道副作用发生前的世界是什么样。")
} finally {
  await rm(demoDir, { recursive: true, force: true })
  console.log(`\ncleanup            : removed ${demoDir}`)
}
