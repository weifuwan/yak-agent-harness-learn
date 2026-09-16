import { tools } from "../../02-tool/07-unified-tool-interface/tools.js"
import { runAgent } from "./runtime.js"

const userPrompt =
  process.argv.slice(2).join(" ").trim() ||
  "请先读取 package.json 找到项目名称，再获取当前服务器时间，最后告诉我项目名称和当前时间。每次只调用一个工具。"

const maxSteps = Number(process.env.AGENT_MAX_STEPS ?? "4")

console.log("========== Agent Loop 06 · Minimal Agent Runtime ==========")
console.log(`user     : ${userPrompt}`)
console.log(`maxSteps : ${maxSteps}`)
console.log("\nindex.ts 不再负责 while / messages / Tool Result / Stop Condition。")
console.log("它只负责配置一次 Agent Run，然后调用 runAgent()。")

const result = await runAgent({
  prompt: userPrompt,
  tools,
  maxSteps,
})

console.log("\n========== Agent Result ==========")
console.log(`status : ${result.status}`)
console.log(`reason : ${result.reason}`)
console.log(`steps  : ${result.steps}`)

if (result.status === "done") {
  console.log("\n[Final Assistant]")
  console.log(result.content)
} else {
  console.log("\nAgent 被 Runtime 的 maxSteps 边界截停。")
}

console.log("\n========== 关键观察 ==========")
console.log("调用方只知道：prompt / tools / maxSteps → AgentRunResult。")
console.log("LoopState、while、Tool execution、Stop Condition 都封装在 runtime.ts 内部。")
console.log("05 收起运行数据；06 收起运行过程。")
console.log("至此 03 · Agent Loop 可以封板，下一阶段进入 04 · Session。")
