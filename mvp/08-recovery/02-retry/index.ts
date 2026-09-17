import { retryOperation } from "./retry.js"

function createFlakyOperation(failuresBeforeSuccess: number) {
  let calls = 0

  return async (attempt: number): Promise<string> => {
    calls += 1
    console.log(`attempt            : ${attempt}`)

    if (calls <= failuresBeforeSuccess) {
      throw new Error(`TEMPORARY-FAILURE-${calls}`)
    }

    return `SUCCESS-ON-ATTEMPT-${attempt}`
  }
}

function createAlwaysFailOperation() {
  return async (attempt: number): Promise<string> => {
    console.log(`attempt            : ${attempt}`)
    throw new Error(`PERMANENT-FAILURE-${attempt}`)
  }
}

console.log("========== Recovery 02 · Retry ==========")
console.log("这一节只研究：同一个 Operation 失败后，能不能在当前步骤内再试一次。")
console.log("暂时没有 Run State、Checkpoint、Resume、Rollback。")

console.log("\n========== Case A · Temporary Failure ==========")
const temporaryResult = await retryOperation(
  createFlakyOperation(2),
  { maxAttempts: 3 },
)

console.log(`result status      : ${temporaryResult.status}`)
console.log(`attempts           : ${temporaryResult.attempts}`)

if (temporaryResult.status === "success") {
  console.log(`value              : ${temporaryResult.value}`)
} else {
  console.log(`error              : ${temporaryResult.error.message}`)
}

console.log("\n========== Case B · Exhausted Attempts ==========")
const permanentResult = await retryOperation(
  createAlwaysFailOperation(),
  { maxAttempts: 3 },
)

console.log(`result status      : ${permanentResult.status}`)
console.log(`attempts           : ${permanentResult.attempts}`)

if (permanentResult.status === "success") {
  console.log(`value              : ${permanentResult.value}`)
} else {
  console.log(`error              : ${permanentResult.error.message}`)
}

if (
  temporaryResult.status !== "success" ||
  temporaryResult.attempts !== 3 ||
  permanentResult.status !== "failed" ||
  permanentResult.attempts !== 3
) {
  throw new Error("Retry demo produced an unexpected result")
}

console.log("\n========== 关键观察 ==========")
console.log("Case A：临时失败可以通过 Retry 在同一步内恢复。")
console.log("Case B：Retry 不是无限重试，超过 maxAttempts 后仍然会失败。")
console.log("Retry 只知道当前 Operation 的 attempt，不知道整个 Run 哪些 Step 已经成功。")
console.log("所以 Retry 解决不了‘整个任务应该从哪里继续’。")
console.log("也不能因为有 Retry 就默认所有副作用操作都可以安全重试。")
console.log("01 = Failure；02 = Retry。")
console.log("下一节 recovery:03 才会加入 Run State，记录整个 Run 执行到哪一步。")
