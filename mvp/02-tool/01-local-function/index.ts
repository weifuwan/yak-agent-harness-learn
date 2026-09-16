const rawA = process.argv[2] ?? "123"
const rawB = process.argv[3] ?? "456"

const a = Number(rawA)
const b = Number(rawB)

if (!Number.isFinite(a) || !Number.isFinite(b)) {
  throw new Error("tool:01 expects two numbers. Example: npm run tool:01 -- 123 456")
}

function add(left: number, right: number): number {
  return left + right
}

console.log("========== Tool 01 · Local Function ==========")
console.log("这一节没有 LLM。Tool 先从一个普通可执行函数开始。")

console.log("\n[Input]")
console.log({ a, b })

console.log("\n[Execute]")
console.log("add(a, b)")

const result = add(a, b)

console.log("\n[Output]")
console.log(result)

console.log("\n[关键观察]")
console.log("Tool 最基础的形态，就是一个程序可以调用并得到结果的能力。")
console.log("现在 add() 只是普通函数；还没有 Tool Schema，也没有让模型选择或调用它。")
