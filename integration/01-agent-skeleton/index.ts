import { DeepSeekProvider } from "../../mvp/01-llm/07-unified-llm-interface/deepseek-provider.js"
import { createMiniCodingAgent } from "./mini-coding-agent.js"

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").trim()
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

const userPrompt =
  process.argv.slice(2).join(" ").trim() ||
  "当前这个学习项目使用什么运行时、语言和执行器？只用一句话回答。"

const llm = new DeepSeekProvider({
  apiKey,
  baseUrl,
  model,
})

const agent = createMiniCodingAgent({
  llm,
  systemPrompt: [
    "你是一个最小 Coding Agent。",
    "只根据当前 Context 回答，不要假装已经读取文件，也不要声称执行了任何 Tool。",
    "当前 integration:01 只有 Context + LLM，还没有 Tool 能力。",
  ].join("\n"),
  projectContext: [
    "project: yak-agent-harness-learn",
    "runtime: Node >=22",
    "language: TypeScript",
    "runner: tsx",
    "stage: integration:01 Agent Skeleton",
  ].join("\n"),
})

console.log("========== Integration 01 · Agent Skeleton ==========")
console.log(`provider           : ${llm.name}`)
console.log(`model              : ${llm.model}`)
console.log(`user               : ${userPrompt}`)
console.log("")
console.log("User Prompt")
console.log("↓")
console.log("MiniCodingAgent")
console.log("↓")
console.log("Context Runtime")
console.log("↓")
console.log("LLM Provider")
console.log("↓")
console.log("Answer")

const result = await agent.run({
  prompt: userPrompt,
})

console.log("\n========== Context ==========")
console.log(`messages           : ${result.context.messages.length}`)
console.log(`selected units     : ${result.context.stats.selectedUnits}`)
console.log(`project context    : ${result.context.stats.hasProjectContext}`)
console.log(`history policy     : ${result.context.stats.historyPolicy}`)

console.log("\n========== Answer ==========")
console.log(result.answer)

console.log("\n========== Usage ==========")
console.log(JSON.stringify(result.usage, null, 2))

console.log("\n========== 关键观察 ==========")
console.log("调用方只调用 agent.run({ prompt })，不直接拼 Model Request。")
console.log("MiniCodingAgent 负责把 Context Runtime 和统一 LLM Provider 串起来。")
console.log("这一轮没有 Tool，所以 Agent 只能基于 Context 回答，不能读取或修改真实项目文件。")
console.log("这不是完整 Coding Agent，只是 Integration 的第一条主链。")
console.log("01 = Skeleton。")
console.log("下一节 integration:02 才加入 read_file，让 Agent 第一次真正 Inspect 项目文件。")
