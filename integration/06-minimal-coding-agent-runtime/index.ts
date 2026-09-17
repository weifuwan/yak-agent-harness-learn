import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DeepSeekToolProvider } from "../02-read-think-answer/tool-capable-provider.js"
import {
  createMiniCodingAgentRuntime,
  type MiniCodingAgentRuntime,
} from "./mini-coding-agent-runtime.js"
import type { ContinuityRunResult } from "../05-session-context-recovery/continuity-agent.js"

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").trim()
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

async function driveToDone(
  agent: MiniCodingAgentRuntime,
  initial: ContinuityRunResult,
): Promise<Extract<ContinuityRunResult, { status: "done" }>> {
  let result = initial
  let safety = 0

  while (result.status !== "done") {
    safety += 1
    if (safety > 8) {
      throw new Error("Mini Coding Agent Runtime exceeded resume safety limit")
    }

    if (result.status === "approval_required") {
      // Demo 驱动层模拟用户批准；Runtime 本身不会替用户批准写操作。
      result = await agent.resumeApproval(result.pending, "approve")
      continue
    }

    result = await agent.resumeRecovery(result.pending, 4)
  }

  return result
}

const workspaceRoot = await mkdtemp(
  join(tmpdir(), "yak-integration-06-"),
)
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

const llm = new DeepSeekToolProvider({ apiKey, baseUrl, model })

// integration:06 的核心：调用方不再自己创建 Tool / Permission / Session / CodingLoop / ContinuityAgent。
const agent = createMiniCodingAgentRuntime({
  llm,
  workspaceRoot,
  snapshotFiles: ["config.ts", "config.test.js"],
  projectContext: "工作区包含 config.ts 和 config.test.js。",
  maxSteps: 8,
  historyMaxUnits: 6,
  compaction: {
    tokenBudget: 12_000,
    keepHotUnits: 2,
    apiKey,
    baseUrl,
    model,
  },
})

console.log("========== Integration 06 · Minimal Coding Agent Runtime ==========")
console.log(`model               : ${llm.model}`)
console.log(`workspace           : ${workspaceRoot}`)
console.log("调用方只创建 MiniCodingAgentRuntime，不再手动拼内部模块。")

try {
  const sessionId = "integration-06-demo"

  console.log("\n========== Run 1 · Edit + Test ==========")

  const run1 = await driveToDone(
    agent,
    await agent.run({
      sessionId,
      prompt: "把 config.ts 里的 port 从 3000 改成 8080，并运行测试确认通过。",
    }),
  )

  const afterRun1 = await readFile(configPath, "utf8")
  const messagesAfterRun1 = agent.getSession(sessionId).messages.length

  console.log(`answer              : ${run1.answer}`)
  console.log(`steps               : ${run1.steps}`)
  console.log(`session messages    : ${messagesAfterRun1}`)
  console.log(`final config:\n${afterRun1}`)

  const testPassed = run1.trace.some(
    (item) =>
      item.toolName === "run_test" &&
      item.result.startsWith("TEST_PASSED"),
  )

  if (
    !afterRun1.includes("8080") ||
    !testPassed ||
    messagesAfterRun1 === 0
  ) {
    throw new Error("Run 1 did not complete edit / test / Session commit")
  }

  console.log("\n========== Run 2 · Session Continuity ==========")

  const run2 = await driveToDone(
    agent,
    await agent.run({
      sessionId,
      prompt: "刚才那个文件里的 port 当前是多少？请读取真实文件再回答，只告诉我文件名和值。",
    }),
  )

  const messagesAfterRun2 = agent.getSession(sessionId).messages.length
  const readInRun2 = run2.trace.some((item) => item.toolName === "read_file")

  console.log(`answer              : ${run2.answer}`)
  console.log(`selected units      : ${run2.contextStats.selectedUnits}`)
  console.log(`session messages    : ${messagesAfterRun2}`)

  if (
    !readInRun2 ||
    !run2.answer.includes("config.ts") ||
    !run2.answer.includes("8080") ||
    run2.contextStats.selectedUnits < 1 ||
    messagesAfterRun2 <= messagesAfterRun1
  ) {
    throw new Error("Run 2 did not preserve Session / Context continuity")
  }

  console.log("\n========== 关键观察 ==========")
  console.log("调用方只面对 createMiniCodingAgentRuntime() 和 agent.run()。")
  console.log("read_file / write_file / run_test / Permission / Coding Loop 都由 Runtime 内部装配。")
  console.log("Session / Context / Compaction / Checkpoint 也隐藏在同一个 Runtime 边界后面。")
  console.log("approval / recovery 仍然保持显式外部决定，不会被 Runtime 偷偷自动批准。")
  console.log("01 = Skeleton；02 = Inspect；03 = Edit；04 = Loop；05 = Continuity；06 = Runtime。")
  console.log("Integration 阶段到这里封板。")
} finally {
  await rm(workspaceRoot, { recursive: true, force: true })
  console.log(`cleanup             : removed ${workspaceRoot}`)
}
