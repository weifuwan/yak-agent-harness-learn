import { getCurrentTimeTool } from "../../02-tool/07-unified-tool-interface/tools.js"
import type { SessionMessage } from "./session.js"
import { createSession } from "./session.js"
import { runAgentWithFullSession } from "./runtime.js"

const session = createSession()
const maxSteps = 4

const firstPrompt =
  "请必须调用 get_current_time 工具获取当前服务器时间。拿到工具结果后，最终只回复：时间已记录。不要在最终回答里输出具体时间。"

const secondPrompt =
  "不要调用任何工具。请从上一轮完整历史中找到 get_current_time 工具返回的精确时间字符串，只回复那个字符串。"

function describeMessage(message: SessionMessage): string {
  if (message.role === "user") {
    return `user: ${message.content}`
  }

  if (message.role === "tool") {
    return `tool(${message.tool_call_id}): ${message.content}`
  }

  const toolCall = message.tool_calls?.[0]
  if (toolCall) {
    return `assistant(tool_call): ${toolCall.function?.name ?? "<unknown>"} ${toolCall.function?.arguments ?? ""}`
  }

  return `assistant: ${message.content ?? "<empty>"}`
}

function printSession(label: string) {
  console.log(`\n[Session · ${label}]`)
  console.log(`messages: ${session.messages.length}`)

  for (const [index, message] of session.messages.entries()) {
    console.log(`${index + 1}. ${describeMessage(message)}`)
  }
}

console.log("========== Session 03 · Full Session History ==========")
console.log("这一节把 Tool Call / Tool Result 也正式写进 Session。")
console.log("Session 不再只是聊天摘要，而是 Agent 真正发生过的完整消息历史。")

printSession("initial")

console.log("\n========== Run #1 ==========")
console.log(`user: ${firstPrompt}`)

const firstResult = await runAgentWithFullSession({
  session,
  prompt: firstPrompt,
  tools: [getCurrentTimeTool],
  maxSteps,
})

if (firstResult.status !== "done") {
  throw new Error("Run #1 did not finish normally")
}

console.log(`assistant: ${firstResult.content}`)
printSession("after run #1")

const firstToolMessage = session.messages.find((message) => message.role === "tool")
if (!firstToolMessage || firstToolMessage.role !== "tool") {
  throw new Error("Run #1 did not persist a tool result into Session")
}

console.log(`\n[Observed Tool Result] ${firstToolMessage.content}`)

console.log("\n========== Run #2 ==========")
console.log(`user: ${secondPrompt}`)

const secondResult = await runAgentWithFullSession({
  session,
  prompt: secondPrompt,
  tools: [],
  maxSteps,
})

if (secondResult.status !== "done") {
  throw new Error("Run #2 did not finish normally")
}

console.log(`assistant: ${secondResult.content}`)
printSession("after run #2")

console.log("\n========== 关键观察 ==========")
console.log("session:02 只保存 user / assistant(final)。")
console.log("session:03 保存 user / assistant(tool_call) / tool(result) / assistant(final)。")
console.log("Run #1 的最终回答没有包含具体时间，但 Tool Result 仍然留在 Session。")
console.log("Run #2 不需要重新调用 Tool，就能从完整历史里读取上一轮的 Tool Result。")
console.log("Session 开始表示‘真正发生过什么’，而不只是‘最后聊了什么’。")
console.log("下一节 session:04 会解决：当同时存在多个会话时，这些历史到底属于谁？")
