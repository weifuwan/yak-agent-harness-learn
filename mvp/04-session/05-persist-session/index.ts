import { getCurrentTimeTool } from "../../02-tool/07-unified-tool-interface/tools.js"
import {
  createSessionStore,
  getOrCreateSession,
  type Session,
} from "../04-multiple-sessions/session-store.js"
import { runAgentInSession } from "../04-multiple-sessions/runtime.js"
import {
  DEFAULT_SESSION_DIR,
  loadSession,
  saveSession,
} from "./session-file-store.js"

const sessionId = "session-a"
const maxSteps = 4

function printSession(label: string, session: Session) {
  console.log(`\n[Session · ${label}]`)
  console.log(`id       : ${session.id}`)
  console.log(`messages : ${session.messages.length}`)

  for (const [index, message] of session.messages.entries()) {
    if (message.role === "user") {
      console.log(`${index + 1}. user: ${message.content}`)
      continue
    }

    if (message.role === "tool") {
      console.log(`${index + 1}. tool(${message.tool_call_id}): ${message.content}`)
      continue
    }

    const toolCall = message.tool_calls?.[0]
    if (toolCall) {
      console.log(
        `${index + 1}. assistant(tool_call): ${toolCall.function?.name ?? "<unknown>"}`,
      )
      continue
    }

    console.log(`${index + 1}. assistant: ${message.content ?? "<empty>"}`)
  }
}

console.log("========== Session 05 · Persist Session ==========")
console.log("这一节只学习 save / load，不继续对话。")
console.log(`session directory: ${DEFAULT_SESSION_DIR}`)

console.log("\n========== Process #1 · Build In-Memory Session ==========")
const firstProcessStore = createSessionStore()

const firstResult = await runAgentInSession({
  sessionStore: firstProcessStore,
  sessionId,
  prompt:
    "请必须调用 get_current_time 工具获取当前服务器时间。拿到结果后，只回复：时间已记录。",
  tools: [getCurrentTimeTool],
  maxSteps,
})

if (firstResult.status !== "done") {
  throw new Error("Process #1 Agent Run did not finish normally")
}

const sessionBeforeSave = getOrCreateSession(firstProcessStore, sessionId)
printSession("before save", sessionBeforeSave)

const toolMessageBeforeSave = sessionBeforeSave.messages.find(
  (message) => message.role === "tool",
)

if (!toolMessageBeforeSave || toolMessageBeforeSave.role !== "tool") {
  throw new Error("Expected a persisted Tool Result before saving Session")
}

console.log("\n========== Save Session ==========")
const savedFile = await saveSession(sessionBeforeSave)
console.log(`saved: ${savedFile}`)
console.log(`Process #1 store size: ${firstProcessStore.size}`)

console.log("\n========== Simulate New Process ==========")
const secondProcessStore = createSessionStore()
console.log(`Process #2 store size before load: ${secondProcessStore.size}`)
console.log("旧的 Map 没有传给 Process #2；此时内存里没有任何 Session。")

console.log("\n========== Load Session From Disk ==========")
const loadedSession = await loadSession(sessionId)
secondProcessStore.set(loadedSession.id, loadedSession)

console.log(`Process #2 store size after load: ${secondProcessStore.size}`)
printSession("loaded from disk", loadedSession)

const toolMessageAfterLoad = loadedSession.messages.find(
  (message) => message.role === "tool",
)

if (!toolMessageAfterLoad || toolMessageAfterLoad.role !== "tool") {
  throw new Error("Loaded Session lost its Tool Result")
}

if (toolMessageAfterLoad.content !== toolMessageBeforeSave.content) {
  throw new Error("Loaded Tool Result does not match the saved Tool Result")
}

console.log("\n========== Persistence Check ==========")
console.log(`tool result before save: ${toolMessageBeforeSave.content}`)
console.log(`tool result after load : ${toolMessageAfterLoad.content}`)
console.log(
  `same tool result       : ${toolMessageBeforeSave.content === toolMessageAfterLoad.content}`,
)

console.log("\n========== 关键观察 ==========")
console.log("session:04 的 SessionStore 只存在于内存。")
console.log("session:05 第一次把 Session 序列化成 JSON 文件。")
console.log("新的空 Map 可以通过 loadSession() 重新得到原来的完整 Session。")
console.log("恢复来源是磁盘文件，不是旧进程中的 Map。")
console.log("这一节到这里停止：加载回来以后还没有继续跑 Agent。")
console.log("下一节 session:06 才会解决 Resume：load 后如何继续对话。")
