import { addTool } from "../../02-tool/07-unified-tool-interface/tools.js"
import { runAgent } from "../../03-agent-loop/06-minimal-agent-runtime/runtime.js"

const maxSteps = 2
const tools = [addTool]

const firstPrompt =
  "请记住这个临时代号：YAK-SESSION-0427。不要调用工具，只回复这个代号。"

const secondPrompt =
  "刚才你回复给我的临时代号是什么？不要重新生成。如果你看不到上一轮对话，请只回答：我不知道上一轮的代号。不要调用工具。"

console.log("========== Session 01 · No Session ==========")
console.log("这一节故意不创建 Session。")
console.log("Run #1 和 Run #2 是两个完全独立的 runAgent()。")

console.log("\n========== Run #1 ==========")
console.log(`user: ${firstPrompt}`)

const firstResult = await runAgent({
  prompt: firstPrompt,
  tools,
  maxSteps,
})

console.log(`status: ${firstResult.status}`)
console.log(`reason: ${firstResult.reason}`)

if (firstResult.status !== "done") {
  throw new Error("Run #1 did not finish normally")
}

console.log(`assistant: ${firstResult.content}`)

console.log("\n---------- runAgent() 已结束 ----------")
console.log("Run #1 内部的 LoopState / messages 已经不可访问。")
console.log("下面创建的是一个全新的 runAgent()，没有传入 Run #1 的任何历史。")

console.log("\n========== Run #2 ==========")
console.log(`user: ${secondPrompt}`)

const secondResult = await runAgent({
  prompt: secondPrompt,
  tools,
  maxSteps,
})

console.log(`status: ${secondResult.status}`)
console.log(`reason: ${secondResult.reason}`)

if (secondResult.status !== "done") {
  throw new Error("Run #2 did not finish normally")
}

console.log(`assistant: ${secondResult.content}`)

console.log("\n========== 关键观察 ==========")
console.log("Run #1 的模型确实看到了临时代号 YAK-SESSION-0427。")
console.log("但是 Run #2 只拿到了自己的 system + user message。")
console.log("两个 runAgent() 之间没有共享 messages，也没有 Session。")
console.log("所以 Agent Loop 只能完成一次 Run，不能自动形成跨 Run 的连续对话。")
console.log("下一节 session:02 才会第一次引入 In-Memory Session。")
