import type { Tool } from "../../02-tool/07-unified-tool-interface/types.js"
import { createSession } from "./session.js"
import { runAgentWithSession } from "./runtime.js"

const session = createSession()
const tools: Tool[] = []
const maxSteps = 2

const firstPrompt =
  "请记住这个临时代号：YAK-SESSION-0427。只回复这个代号。"

const secondPrompt =
  "刚才你回复给我的临时代号是什么？只回复代号本身。"

function printSession(label: string) {
  console.log(`\n[Session · ${label}]`)
  console.log(`messages: ${session.messages.length}`)

  for (const [index, message] of session.messages.entries()) {
    console.log(`${index + 1}. ${message.role}: ${message.content}`)
  }
}

console.log("========== Session 02 · In-Memory Session ==========")
console.log("这一节第一次创建 Session，并让两个 Agent Run 共用同一个 session.messages。")
console.log("当前只保存在内存里；进程退出后会全部消失。")

printSession("initial")

console.log("\n========== Run #1 ==========")
console.log(`user: ${firstPrompt}`)

const firstResult = await runAgentWithSession({
  session,
  prompt: firstPrompt,
  tools,
  maxSteps,
})

if (firstResult.status !== "done") {
  throw new Error("Run #1 did not finish normally")
}

console.log(`assistant: ${firstResult.content}`)
printSession("after run #1")

console.log("\n========== Run #2 ==========")
console.log(`user: ${secondPrompt}`)

const secondResult = await runAgentWithSession({
  session,
  prompt: secondPrompt,
  tools,
  maxSteps,
})

if (secondResult.status !== "done") {
  throw new Error("Run #2 did not finish normally")
}

console.log(`assistant: ${secondResult.content}`)
printSession("after run #2")

console.log("\n========== 关键观察 ==========")
console.log("Run #1 和 Run #2 已经不是两个完全隔离的世界。")
console.log("同一个 Session.messages 跨 Run 持续存在。")
console.log("模型并没有自己记住，而是应用把历史重新传给了模型。")
console.log("当前 Session 只保存 user / assistant 最终文本。")
console.log("Tool Call / Tool Result 还没有进入 Session，这会成为 session:03 的问题。")
console.log("程序退出后这份 Session 仍然会丢失；持久化留到 session:05。")
