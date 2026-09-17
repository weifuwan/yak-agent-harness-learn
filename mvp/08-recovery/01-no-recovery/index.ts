import { appendFile, mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  runWithoutRecovery,
  type RecoveryStep,
} from "./no-recovery.js"

async function readOrEmpty(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8")
  } catch {
    return ""
  }
}

function countMarker(content: string, marker: string): number {
  return content
    .split("\n")
    .filter((line) => line.trim() === marker)
    .length
}

const demoDir = await mkdtemp(join(tmpdir(), "yak-recovery-01-"))
const aPath = join(demoDir, "A.txt")
const bPath = join(demoDir, "B.txt")

const steps: RecoveryStep[] = [
  {
    name: "Step 1 · write A",
    async execute() {
      await appendFile(aPath, "WRITE-A\n", "utf8")
    },
  },
  {
    name: "Step 2 · write B",
    async execute() {
      await appendFile(bPath, "WRITE-B\n", "utf8")
    },
  },
  {
    name: "Step 3 · simulated failure",
    async execute() {
      throw new Error("SIMULATED-RECOVERY-01-FAILURE")
    },
  },
]

async function runAndCapture(label: string) {
  console.log(`\n========== ${label} ==========`)

  try {
    await runWithoutRecovery(steps)
    throw new Error("Demo expected Step 3 to fail")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log(`run result         : FAILED`)
    console.log(`error              : ${message}`)
  }
}

console.log("========== Recovery 01 · No Recovery ==========")
console.log("故意让 Step 1 / Step 2 产生真实副作用，然后让 Step 3 失败。")
console.log("当前没有 Retry、Run State、Checkpoint、Resume、Rollback。")

try {
  await runAndCapture("First Run")

  const firstA = await readOrEmpty(aPath)
  const firstB = await readOrEmpty(bPath)

  console.log("\n========== After First Failure ==========")
  console.log(`A writes           : ${countMarker(firstA, "WRITE-A")}`)
  console.log(`B writes           : ${countMarker(firstB, "WRITE-B")}`)
  console.log("recovery state     : NONE")
  console.log("resume point       : UNKNOWN")
  console.log("副作用已经存在，但 Runtime 没有保存‘哪些步骤成功、从哪一步继续’。")

  console.log("\n不知道从哪里继续，所以故意演示最天真的方案：整段从头再跑。")
  await runAndCapture("Naive Restart From Step 1")

  const secondA = await readOrEmpty(aPath)
  const secondB = await readOrEmpty(bPath)
  const aWrites = countMarker(secondA, "WRITE-A")
  const bWrites = countMarker(secondB, "WRITE-B")

  console.log("\n========== After Naive Restart ==========")
  console.log(`A writes           : ${aWrites}`)
  console.log(`B writes           : ${bWrites}`)
  console.log(`A duplicated       : ${aWrites > 1}`)
  console.log(`B duplicated       : ${bWrites > 1}`)

  if (aWrites !== 2 || bWrites !== 2) {
    throw new Error("No Recovery demo produced an unexpected side-effect count")
  }

  console.log("\n========== 关键观察 ==========")
  console.log("第一次失败时，Step 1 / Step 2 的副作用已经真实发生。")
  console.log("Runtime 没有 Run State，所以失败后不知道哪些 Step 已成功。")
  console.log("没有 Resume Point，只能天真地从头重跑时，已成功副作用会重复。")
  console.log("没有 Checkpoint，也无法把文件恢复到 Run 之前的状态。")
  console.log("01 = Failure。")
  console.log("下一节 recovery:02 才第一次加入 Retry，先解决‘同一步临时失败能不能再试一次’。")
} finally {
  await rm(demoDir, { recursive: true, force: true })
  console.log(`\ncleanup            : removed ${demoDir}`)
}
