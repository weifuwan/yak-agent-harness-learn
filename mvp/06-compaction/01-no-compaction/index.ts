import { prepareContext } from "../../05-context/06-minimal-context-runtime/context-runtime.js"
import type {
  ModelContext,
  Session,
  SessionMessage,
} from "../../05-context/06-minimal-context-runtime/types.js"

const TOKEN_BUDGET = 2_000
const KEEP_RECENT_UNITS = 12

function createLongSession(unitCount: number): Session {
  const messages: SessionMessage[] = []

  for (let unit = 1; unit <= unitCount; unit += 1) {
    const id = `UNIT-${String(unit).padStart(2, "0")}`
    const repeatedDetail = [
      `这是 ${id} 中必须继续保留的执行背景。`,
      "其中包含本轮任务后续仍可能依赖的约束、决定、工具观察和中间结论。",
      "为了制造一个稳定的学习场景，这段内容会重复扩展，让单个 Unit 本身也占用明显的 Context 空间。",
    ].join("")

    messages.push(
      {
        role: "user",
        content: [
          `历史任务 ${id}。`,
          `请记住关键事实 FACT-${id}。`,
          repeatedDetail.repeat(6),
        ].join("\n"),
      },
      {
        role: "assistant",
        content: [
          `已记录 FACT-${id}。`,
          "这条 assistant 消息同样代表 Agent 已经发生过的事实历史。",
          repeatedDetail.repeat(4),
        ].join("\n"),
      },
    )
  }

  return { messages }
}

function messageText(message: ModelContext["messages"][number]): string {
  if (message.role === "assistant") {
    const toolCalls = message.tool_calls
      ? JSON.stringify(message.tool_calls)
      : ""
    return `${message.content ?? ""}${toolCalls}`
  }

  if (message.role === "tool") {
    return `${message.tool_call_id}${message.content}`
  }

  return message.content
}

function estimateContextTokens(context: ModelContext): number {
  const characters = context.messages.reduce(
    (sum, message) => sum + messageText(message).length,
    0,
  )

  // compaction:01 只需要稳定制造 overflow 问题。
  // 这里故意使用一个非常粗略的学习版估算：约 4 个字符算 1 token。
  // 真正 tokenizer / provider 差异不属于这一轮。
  return Math.ceil(characters / 4)
}

function formatDelta(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

const session = createLongSession(20)

const context = prepareContext({
  systemPrompt: [
    "你是一个严格基于当前 Context 工作的 Agent。",
    "不要假设没有进入 Context 的历史仍然可见。",
  ].join("\n"),
  currentTask:
    "继续处理当前任务。最近 12 个历史 Unit 都被当前 Context Policy 判定为需要保留。",
  session,
  projectContext: [
    "project: yak-agent-harness-learn",
    "stage: compaction:01",
    "goal: observe context overflow before adding compaction",
  ].join("\n"),
  policy: {
    history: {
      type: "recent_units",
      maxUnits: KEEP_RECENT_UNITS,
    },
  },
})

const estimatedTokens = estimateContextTokens(context)
const overflowTokens = estimatedTokens - TOKEN_BUDGET

console.log("========== Compaction 01 · No Compaction ==========")
console.log("Context Selection 已经完成，但这一轮故意没有任何 Compaction。")
console.log("")
console.log(`session history messages : ${context.stats.totalHistoryMessages}`)
console.log(`session units            : ${context.stats.totalUnits}`)
console.log(`history policy           : ${context.stats.historyPolicy}`)
console.log(`selected units           : ${context.stats.selectedUnits}`)
console.log(`selected history messages: ${context.stats.selectedHistoryMessages}`)
console.log(`model context messages   : ${context.messages.length}`)
console.log("")
console.log(`estimated tokens         : ${estimatedTokens}`)
console.log(`demo token budget        : ${TOKEN_BUDGET}`)
console.log(`budget delta             : ${formatDelta(overflowTokens)}`)
console.log(`within budget            : ${estimatedTokens <= TOKEN_BUDGET}`)

console.log("\n========== 关键观察 ==========")
console.log("Session 一共有 20 个 Unit，但 Context Runtime 已经只选择最近 12 个。")
console.log("所以这里的问题已经不是：哪些历史应该进入 Context？")
console.log("问题是：这 12 个已经决定要保留的 Unit，本身仍然超过预算。")
console.log("继续减少 selected units 可能会丢掉当前任务仍需要的信息。")
console.log("compaction:01 不解决这个问题，只把 overflow 问题稳定暴露出来。")
console.log("下一节 compaction:02 才会第一次讨论：什么时候应该触发 Compaction？")
