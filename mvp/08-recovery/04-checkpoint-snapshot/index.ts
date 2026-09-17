import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  createRunState,
  runWithState,
  type RecoveryStep,
} from "../03-run-state/run-state.js"
import {
  createCheckpoint,
  findSnapshot,
} from "./checkpoint.js"

const demoDir = await mkdtemp(join(tmpdir(), "yak-recovery-04-"))
const aPath = join(demoDir, "A.txt")
const bPath = join(demoDir, "B.txt")
const reportPath = join(demoDir, "report.txt")

await writeFile(aPath, "OLD-A", "utf8")
await writeFile(bPath, "OLD-B", "utf8")

console.log("========== Recovery 04 · Checkpoint / Snapshot ==========")
console.log("这一节只保存副作用发生前的文件状态，不执行 Rollback。")

try {
  const checkpoint = await createCheckpoint(
    "checkpoint-recovery-0401",
    [aPath, bPath],
  )

  console.log("\n========== Before Run ==========")
  console.log(`checkpoint id       : ${checkpoint.id}`)
  console.log(`snapshot A          : ${findSnapshot(checkpoint, aPath).content}`)
  console.log(`snapshot B          : ${findSnapshot(checkpoint, bPath).content}`)

  const steps: RecoveryStep[] = [
    {
      id: "step-01",
      name: "update A",
      maxAttempts: 1,
      async execute() {
        await writeFile(aPath, "NEW-A", "utf8")
      },
    },
    {
      id: "step-02",
      name: "update B",
      maxAttempts: 1,
      async execute() {
        await writeFile(bPath, "NEW-B", "utf8")
      },
    },
    {
      id: "step-03",
      name: "run test",
      maxAttempts: 1,
      async execute() {
        throw new Error("SIMULATED-RECOVERY-04-FAILURE")
      },
    },
    {
      id: "step-04",
      name: "write report",
      maxAttempts: 1,
      async execute() {
        await writeFile(reportPath, "REPORT", "utf8")
      },
    },
  ]

  const state = createRunState("run-recovery-0401", steps)
  await runWithState(steps, state)

  const currentA = await readFile(aPath, "utf8")
  const currentB = await readFile(bPath, "utf8")
  const snapshotA = findSnapshot(checkpoint, aPath).content
  const snapshotB = findSnapshot(checkpoint, bPath).content

  console.log("\n========== After Failure ==========")
  console.log(`run status          : ${state.status}`)
  console.log(`current step        : ${state.currentStepId}`)
  console.log(`current A           : ${currentA}`)
  console.log(`current B           : ${currentB}`)
  console.log(`snapshot A          : ${snapshotA}`)
  console.log(`snapshot B          : ${snapshotB}`)
  console.log(`A changed           : ${currentA !== snapshotA}`)
  console.log(`B changed           : ${currentB !== snapshotB}`)

  const [step1, step2, step3, step4] = state.steps

  if (
    state.status !== "failed" ||
    state.currentStepId !== "step-03" ||
    step1?.status !== "success" ||
    step2?.status !== "success" ||
    step3?.status !== "failed" ||
    step4?.status !== "pending" ||
    currentA !== "NEW-A" ||
    currentB !== "NEW-B" ||
    snapshotA !== "OLD-A" ||
    snapshotB !== "OLD-B"
  ) {
    throw new Error("Checkpoint / Snapshot demo produced an unexpected result")
  }

  console.log("\n========== 关键观察 ==========")
  console.log("Run State 记录的是：Step 1 / 2 成功，Step 3 失败，Step 4 pending。")
  console.log("Checkpoint 记录的是：副作用发生前 A / B 的旧内容。")
  console.log("失败以后 Current 已经是 NEW，但 Snapshot 仍然保留 OLD。")
  console.log("所以 State 解决‘做到哪’，Snapshot 解决‘恢复材料是什么’。")
  console.log("这一轮故意不执行 Rollback，文件仍然保持 NEW-A / NEW-B。")
  console.log("01 = Failure；02 = Retry；03 = State；04 = Checkpoint。")
  console.log("下一节 recovery:05 才真正使用 Run State + Checkpoint 做 Resume / Rollback。")
} finally {
  await rm(demoDir, { recursive: true, force: true })
  console.log(`\ncleanup             : removed ${demoDir}`)
}
