import { createReadOnlyCodingAgent } from "./mini-coding-agent.js"
import { DeepSeekToolProvider } from "./tool-capable-provider.js"

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").trim()
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

const prompt =
  process.argv.slice(2).join(" ").trim() ||
  "请读取 package.json，只告诉我 engines.node 的值，并说明这个结论来自 package.json。"

const llm = new DeepSeekToolProvider({
  apiKey,
  baseUrl,
  model,
})

const agent = createReadOnlyCodingAgent({
  llm,
  systemPrompt: [
    "你是一个只读的 Mini Coding Agent。",
    "当用户的问题依赖项目文件真实内容时，不要猜，必须使用 read_file。",
    "当前只允许一次 read_file；拿到 Tool Result 后直接回答。",
  ].join("\n"),
  projectContext: [
    "project: yak-agent-harness-learn",
    "workspace: current process working directory",
    "注意：Project Context 不包含 package.json 的真实内容。",
  ].join("\n"),
})

console.log("========== Integration 02 · Read → Think → Answer ==========")
console.log(`model              : ${llm.model}`)
console.log(`user               : ${prompt}`)
console.log("能力边界           : read_file only, at most one tool round")

const result = await agent.run({ prompt })

console.log("\n========== Execution ==========")
console.log(`model turns        : ${result.modelTurns}`)
console.log(`used read_file     : ${Boolean(result.read)}`)

if (result.read) {
  console.log(`tool call id       : ${result.read.toolCallId}`)
  console.log(`tool arguments     : ${result.read.rawArguments}`)
  console.log(`tool result chars  : ${result.read.result.length}`)
}

console.log("\n========== Context ==========")
console.log(JSON.stringify(result.context.stats, null, 2))

console.log("\n========== Answer ==========")
console.log(result.answer)

if (!result.read) {
  throw new Error(
    "Integration 02 demo expected the model to use read_file, but it answered without reading the file",
  )
}

console.log("\n========== 关键观察 ==========")
console.log("integration:01 只有 Agent → Context → LLM。")
console.log("integration:02 第一次让模型主动请求 read_file，再根据 Tool Result 回答。")
console.log("Agent 不需要提前把 package.json 内容塞进 Project Context。")
console.log("这一轮只允许一次读取，不做 write_file，不做 Permission，也不做多步骤 Tool Loop。")
console.log("01 = Skeleton；02 = Inspect。")
console.log("下一节 integration:03 才进入 Read → Edit → Permission → Write。")
