import {
  createSessionStore,
  getOrCreateSession,
} from "../04-multiple-sessions/session-store.js"
import { runAgentInSession } from "../04-multiple-sessions/runtime.js"
import {
  loadSession,
  saveSession,
} from "../05-persist-session/session-file-store.js"

const sessionId = "session-resume"
const maxSteps = 2
const tools = []
const rememberedCode = "RESUME-0601"

const firstPrompt =
  `请记住这个会话代号：${rememberedCode}。只回复这个代号本身。`

const resumePrompt =
  "这是一个重新启动后的新进程。请根据已经恢复的上一轮历史，告诉我上一轮让我记住的会话代号。只回复代号本身。"

console.log("========== Session 06 · Resume Session ==========")
console.log("这一节把 Persist + Load + Continue 串成真正的 Resume。")

console.log("\n========== Process #1 · Run And Save ==========")
const firstProcessStore = createSessionStore()

const firstResult = await runAgentInSession({
  sessionStore: firstProcessStore,
  sessionId,
  prompt: firstPrompt,
  tools,
  maxSteps,
})

if (firstResult.status !== "done") {
  throw new Error("Process #1 Agent Run did not finish normally")
}

console.log(`assistant: ${firstResult.content}`)

const firstSession = getOrCreateSession(firstProcessStore, sessionId)
const messagesBeforeSave = firstSession.messages.length
const savedFile = await saveSession(firstSession)

console.log(`messages before save: ${messagesBeforeSave}`)
console.log(`saved: ${savedFile}`)

console.log("\n========== Process #2 · Load Into New Store ==========")
const secondProcessStore = createSessionStore()
console.log(`store size before load: ${secondProcessStore.size}`)

const loadedSession = await loadSession(sessionId)
secondProcessStore.set(loadedSession.id, loadedSession)

console.log(`store size after load : ${secondProcessStore.size}`)
console.log(`loaded messages       : ${loadedSession.messages.length}`)

const loadedHistory = JSON.stringify(loadedSession.messages)
if (!loadedHistory.includes(rememberedCode)) {
  throw new Error("Loaded Session does not contain the remembered code")
}

console.log("\n========== Process #2 · Resume Agent ==========")
console.log(`user: ${resumePrompt}`)

const resumedResult = await runAgentInSession({
  sessionStore: secondProcessStore,
  sessionId,
  prompt: resumePrompt,
  tools,
  maxSteps,
})

if (resumedResult.status !== "done") {
  throw new Error("Resumed Agent Run did not finish normally")
}

console.log(`assistant: ${resumedResult.content}`)

if (!resumedResult.content.includes(rememberedCode)) {
  throw new Error(
    `Resume failed: expected answer to contain ${rememberedCode}, received: ${resumedResult.content}`,
  )
}

const resumedSession = getOrCreateSession(secondProcessStore, sessionId)
const messagesAfterResume = resumedSession.messages.length

if (messagesAfterResume <= messagesBeforeSave) {
  throw new Error("Resume did not append new history to the loaded Session")
}

console.log(`messages after resume: ${messagesAfterResume}`)

console.log("\n========== Save Updated Session Again ==========")
await saveSession(resumedSession)

// 再次从磁盘读取，只验证 Resume 产生的新历史也已经持久化。
const reloadedSession = await loadSession(sessionId)

console.log(`reloaded messages: ${reloadedSession.messages.length}`)

if (reloadedSession.messages.length !== messagesAfterResume) {
  throw new Error("The resumed history was not persisted back to disk")
}

const reloadedHistory = JSON.stringify(reloadedSession.messages)
if (!reloadedHistory.includes(resumePrompt)) {
  throw new Error("Reloaded Session does not contain the resumed user message")
}

console.log("\n========== Resume Check ==========")
console.log(`remembered code        : ${rememberedCode}`)
console.log(`resumed answer         : ${resumedResult.content}`)
console.log(`history grew           : ${messagesBeforeSave} → ${messagesAfterResume}`)
console.log(`persisted after resume : ${reloadedSession.messages.length === messagesAfterResume}`)

console.log("\n========== 关键观察 ==========")
console.log("session:05 只做到 save / load，证明历史还在。")
console.log("session:06 在新进程中 load 后，再次把同一个 Session 交给 Agent Runtime。")
console.log("模型能使用旧历史回答新问题，并把新的 user / assistant 消息继续追加到原 Session。")
console.log("Resume 后再次 save，新的历史也会继续持久化。")
console.log("至此 Session 的 Identity / History / Persistence / Resume 已经形成完整闭环。")
console.log("下一阶段进入 05 · Context：完整 Session 不等于每轮都应该全部发送给模型。")
