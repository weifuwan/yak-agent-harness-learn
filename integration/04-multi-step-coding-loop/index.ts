import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createPermissionRuntime } from "../../mvp/07-permission/06-minimal-permission-runtime/permission-runtime.js"
import { DeepSeekToolProvider } from "../02-read-think-answer/tool-capable-provider.js"
import {
  createIntegrationPermissionRules,
  createWorkspaceReadFileTool,
  createWorkspaceWriteFileTool,
} from "../03-read-edit-permission-write/workspace-tools.js"
import {
  createMultiStepCodingAgent,
  type CodingLoopResult,
} from "./coding-loop.js"
import { createRunTestTool } from "./run-test-tool.js"

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").trim()
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

const llm = new DeepSeekToolProvider({
  apiKey,
  baseUrl,
  model,
})

const systemPrompt = [
  "你是一个最小 Coding Agent。",
  "你可以自行决定下一步调用 read_file、write_file、run_test，或者直接给最终答案。",
  "可以在同一个 Model Turn 中调用多个彼此独立的工具，例如同时读取多个文件。",
  "如果后续操作依赖前一个工具的结果，应先等待 Tool Result，再在下一轮决定后续操作。",
  "修改文件前应先读取真实内容。",
  "write_file.content 必须是完整纯文本文件内容，不要使用 Markdown 代码围栏。",
  "修改完成后必须调用 run_test 验证。",
  "如果测试失败，应根据测试结果继续检查和修改，而不是直接宣布完成。",
  "只有 run_test 明确返回 TEST_PASSED 后，才能告诉用户任务完成。",
].join("\n")

const prompt = "把 config.ts 里的 port 从 3000 改成 8080，并运行测试确认通过。"
const workspaceRoot = await mkdtemp(join(tmpdir(), "yak-integration-04-"))
const configPath = join(workspaceRoot, "config.ts")
const testPath = join(workspaceRoot, "config.test.js")

await writeFile(
  configPath,
  "export const config = {\n  port: 3000,\n}\n",
  "utf8",
)

await writeFile(
  testPath,
  [
    'const test = require("node:test")',
    'const assert = require("node:assert/strict")',
    'const { readFile } = require("node:fs/promises")',
    'const { join } = require("node:path")',
    "",
    'test("config port is 8080", async () => {',
    '  const content = await readFile(join(__dirname, "config.ts"), "utf8")',
    '  assert.match(content, /port:\\s*8080/)',
    "})",
    "",
  ].join("\n"),
  "utf8",
)

const readTool = createWorkspaceReadFileTool(workspaceRoot)
const writeTool = createWorkspaceWriteFileTool(workspaceRoot)
const runTestTool = createRunTestTool(workspaceRoot)
const permissionRuntime = createPermissionRuntime({
  tools: [writeTool],
  workspaceRoot,
  rules: createIntegrationPermissionRules(),
})

const agent = createMultiStepCodingAgent({
  llm,
  readTool,
  writeTool,
  runTestTool,
  permissionRuntime,
  systemPrompt,
  projectContext: [
    "工作区包含 config.ts 和 config.test.js。",
    "用户要求修改 config.ts 并用 run_test 验证。",
  ].join("\n"),
  maxSteps: 8,
})

function printTrace(result: CodingLoopResult): void {
  console.log("trace:")
  for (const item of result.trace) {
    const firstLine = item.result.split("\n")[0] ?? ""
    console.log(
      `- step=${item.step} tool=${item.toolName} result=${firstLine}`,
    )
  }
}

console.log("========== Integration 04 · Multi-Step Coding Loop ==========")
console.log(`model               : ${llm.model}`)
console.log(`prompt              : ${prompt}`)
console.log("同一个 Model Turn 允许返回多个 Tool Call，Runtime 会逐个处理并补齐 Tool Result。")
console.log("Demo 会自动 approve 普通 workspace 写入，只为了让 Loop 连续跑完。")

try {
  let result = await agent.start({ prompt })

  while (result.status === "approval_required") {
    console.log(
      `approval_required   : ${result.request.toolCall.function.name} ${result.request.resourcePath}`,
    )

    // 这是 Demo 驱动层模拟用户批准；Permission Runtime 本身没有自动批准。
    result = await agent.resume(result.pending, "approve")
  }

  console.log(`status              : ${result.status}`)
  console.log(`steps               : ${result.steps}`)
  printTrace(result)

  if (result.status === "done") {
    console.log(`answer              : ${result.answer}`)
  } else {
    console.log(`reason              : ${result.reason}`)
  }

  const finalConfig = await readFile(configPath, "utf8")
  const toolNames = result.trace.map((item) => item.toolName)
  const testPassed = result.trace.some(
    (item) =>
      item.toolName === "run_test" &&
      item.result.startsWith("TEST_PASSED"),
  )

  console.log(`final config:\n${finalConfig}`)

  if (
    result.status !== "done" ||
    !finalConfig.includes("8080") ||
    !toolNames.includes("read_file") ||
    !toolNames.includes("write_file") ||
    !toolNames.includes("run_test") ||
    !testPassed
  ) {
    throw new Error("Multi-Step Coding Loop demo produced an unexpected result")
  }

  console.log("\n========== 关键观察 ==========")
  console.log("Runtime 不再预先写死 read → write → answer。")
  console.log("一个 Model Turn 可以产生多个 Tool Call；它们会共享同一个 step。")
  console.log("每个 Tool Call 都必须得到自己的 Tool Result，处理完整批次后才能再次调用 LLM。")
  console.log("write_file 即使在 Tool Batch 内也必须经过 Permission Runtime。")
  console.log("run_test 是固定能力，不接受任意 shell 命令。")
  console.log("maxSteps 限制模型最多能继续多少个 Model Turn，而不是 Tool Call 数量。")
  console.log("01 = Skeleton；02 = Inspect；03 = Edit；04 = Loop。")
  console.log("下一节 integration:05 才把 Session / Context / Recovery 接回完整主链。")
} finally {
  await rm(workspaceRoot, { recursive: true, force: true })
  console.log(`cleanup             : removed ${workspaceRoot}`)
}
