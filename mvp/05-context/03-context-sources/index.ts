import {
  buildContext,
  type Message,
  type ModelContext,
} from "./context-builder.js"

type Usage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

type ModelResult = {
  content: string
  usage: Usage
}

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

const systemPrompt =
  "你是一个严格基于给定上下文回答的助手。不要用常识猜测缺失信息。信息不足时只回答 UNKNOWN。"

const currentTask =
  "这个项目使用什么运行时、语言和 TypeScript 执行器？如果上下文有明确答案，请按 runtime=...; language=...; runner=... 的格式回答；否则只回答 UNKNOWN。"

const sessionHistory: Message[] = [
  {
    role: "user",
    content: "上一轮我们讨论的是如何设计一个简单的 Session。",
  },
  {
    role: "assistant",
    content: "Session 用来保存完整的会话历史。",
  },
  {
    role: "user",
    content: "再之前我们还讨论了 Agent Loop。",
  },
  {
    role: "assistant",
    content: "Agent Loop 负责让模型和 Tool 持续运行直到停止。",
  },
]

const projectContext = [
  "package.json 摘要：",
  "- engines.node = >=22",
  "- type = module",
  "- devDependencies.typescript = ^5.9.0",
  "- devDependencies.tsx = ^4.20.0",
].join("\n")

async function callModel(context: ModelContext): Promise<ModelResult> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: context.messages,
      stream: false,
    }),
  })

  const rawBody = await response.text()
  if (!response.ok) {
    throw new Error(`Model HTTP ${response.status}: ${rawBody}`)
  }

  const payload = JSON.parse(rawBody) as {
    choices?: Array<{
      message?: {
        content?: string | null
      }
    }>
    usage?: Usage
  }

  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error("Model returned no assistant text")
  }

  return {
    content,
    usage: payload.usage ?? {},
  }
}

function token(value: number | undefined): number | string {
  return value ?? "N/A"
}

async function runCase(label: string, includeProjectContext: boolean) {
  const context = buildContext({
    systemPrompt,
    currentTask,
    sessionHistory,
    projectContext: includeProjectContext ? projectContext : undefined,
  })

  console.log(`\n========== ${label} ==========`)
  console.log("Context Sources:")
  console.log(`  systemPrompt   : ${context.sources.hasSystemPrompt}`)
  console.log(`  sessionHistory : ${context.sources.historyMessages} messages`)
  console.log(`  projectContext : ${context.sources.hasProjectContext}`)
  console.log(`  currentTask    : ${context.sources.hasCurrentTask}`)
  console.log(`Model Context messages: ${context.messages.length}`)

  const result = await callModel(context)

  console.log(`assistant     : ${result.content}`)
  console.log(`prompt_tokens : ${token(result.usage.prompt_tokens)}`)

  return result.content
}

console.log("========== Context 03 · Context Sources ==========")
console.log(`model: ${model}`)
console.log("当前任务保持不变，只改变 Context Builder 是否收到 projectContext。")
console.log("这一节不做 History Selection；Session History 仍然全部进入 Context。")

const withoutProject = await runCase(
  "Case A · No Project Context",
  false,
)

const withProject = await runCase(
  "Case B · With Project Context",
  true,
)

console.log("\n========== Comparison ==========")
console.log(`without project context: ${withoutProject}`)
console.log(`with project context   : ${withProject}`)

console.log("\n========== 关键观察 ==========")
console.log("Context 不等于 Session History。")
console.log("同一个 Context Builder 可以同时接收 System、Current Task、Session History、Project Context。")
console.log("Session History 里没有项目技术栈时，仅靠历史无法回答当前项目问题。")
console.log("加入 Project Context 后，模型才获得完成当前任务所需要的项目事实。")
console.log("所以 Context 是多个信息源组装出的本轮工作输入，而不是单纯的聊天历史。")
console.log("下一节 context:04 才会开始解决：Session History 到底应该选哪些？")
