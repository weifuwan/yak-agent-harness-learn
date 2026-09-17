import {
  createSessionStore,
  getOrCreateSession,
} from "./session-store.js"
import { runAgentInSession } from "./runtime.js"

const sessionStore = createSessionStore()
const maxSteps = 2
const tools = []

const sessionA = "session-a"
const sessionB = "session-b"

const promptA1 = "请记住我的会话代号是 AAA-111。只回复 AAA-111。"
const promptB1 = "请记住我的会话代号是 BBB-222。只回复 BBB-222。"
const promptA2 = "我的会话代号是什么？只回复代号本身。"
const promptB2 = "我的会话代号是什么？只回复代号本身。"

function printStore() {
  console.log(`\n[Session Store] sessions: ${sessionStore.size}`)

  for (const [id, session] of sessionStore.entries()) {
    console.log(`- ${id}: messages=${session.messages.length}`)
  }
}

async function run(sessionId: string, prompt: string) {
  console.log(`\n[${sessionId}] user: ${prompt}`)

  const result = await runAgentInSession({
    sessionStore,
    sessionId,
    prompt,
    tools,
    maxSteps,
  })

  if (result.status !== "done") {
    throw new Error(`${sessionId} did not finish normally`)
  }

  console.log(`[${sessionId}] assistant: ${result.content}`)
  return result.content
}

console.log("========== Session 04 · Multiple Sessions ==========")
console.log("这一节第一次引入 sessionId 和 SessionStore。")
console.log("同一个进程里同时维护两段独立历史，验证它们不会串话。")

printStore()

console.log("\n========== Round 1 · Create Two Sessions ==========")
await run(sessionA, promptA1)
await run(sessionB, promptB1)
printStore()

console.log("\n========== Round 2 · Continue Separately ==========")
const answerA = await run(sessionA, promptA2)
const answerB = await run(sessionB, promptB2)
printStore()

const a = getOrCreateSession(sessionStore, sessionA)
const b = getOrCreateSession(sessionStore, sessionB)

const historyA = JSON.stringify(a.messages)
const historyB = JSON.stringify(b.messages)

if (historyA.includes("BBB-222")) {
  throw new Error("Session A was contaminated by Session B history")
}

if (historyB.includes("AAA-111")) {
  throw new Error("Session B was contaminated by Session A history")
}

console.log("\n========== Isolation Check ==========")
console.log(`session-a answer: ${answerA}`)
console.log(`session-b answer: ${answerB}`)
console.log(`session-a contains BBB-222: ${historyA.includes("BBB-222")}`)
console.log(`session-b contains AAA-111: ${historyB.includes("AAA-111")}`)

console.log("\n========== 关键观察 ==========")
console.log("session:03 解决了 Session 里应该保存哪些完整历史。")
console.log("session:04 给每份历史增加 Identity：sessionId。")
console.log("SessionStore 用 Map<string, Session> 在同一进程里维护多份独立 Session。")
console.log("Runtime 每次只根据 sessionId 读取和更新对应的那一份历史。")
console.log("当前仍然只是内存数据；程序退出以后整个 SessionStore 会消失。")
console.log("下一节 session:05 会解决：这些 Session 怎么跨进程保存下来？")
