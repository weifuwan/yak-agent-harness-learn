import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createSessionStore } from "../../mvp/04-session/04-multiple-sessions/session-store.js"
import { createPermissionRuntime } from "../../mvp/07-permission/06-minimal-permission-runtime/permission-runtime.js"
import { DeepSeekToolProvider } from "../02-read-think-answer/tool-capable-provider.js"
import {
  createIntegrationPermissionRules,
  createWorkspaceReadFileTool,
  createWorkspaceWriteFileTool,
} from "../03-read-edit-permission-write/workspace-tools.js"
import { createMultiStepCodingAgent } from "../04-multi-step-coding-loop/coding-loop.js"
import { createRunTestTool } from "../04-multi-step-coding-loop/run-test-tool.js"
import {
  createContinuityAgent,
  type ContinuityAgent,
  type ContinuityRunResult,
} from "./continuity-agent.js"
import { ScriptedRecoveryProvider } from "./scripted-provider.js"

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").trim()
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

const systemPrompt = [
  "你是一个最小 Coding Agent。",
  "你可以根据当前任务和会话历史决定调用 read_file、write_file、run_test，或者直接回答。",
  "如果用户说‘刚才那个’，必须结合 Session 历史判断具体指代，不要让用户重复已经提供过的信息。",
  "涉及项目事实时先读取真实文件，不要猜。",
  "修改文件前先读取真实内容。",
  "write_file.content 必须是完整纯文本文件内容，不要使用 Markdown 代码围栏。",
  "修改完成后运行测试；只有 TEST_PASSED 后才能宣布修改完成。",
].join("\n")

async function driveToDone(
  agent: ContinuityAgent,
  initial: ContinuityRunResult,
): Promise<Extract<ContinuityRunResult, { status: "done" }>> {
  let result = initial
  let safety = 0

  while (result.status !== "done") {
    safety += 1
    if (safety > 8) {
      throw new Error("Continuity demo exceeded resume safety limit")
    }

    if (result.status === "approval_required") {
      result = await agent.resumeApproval(result.pending, "approve")
      continue
    }

    result = await agent.resumeRecovery(result.pending, 4)
  }

  return result
}

async function createWorkspace(
  prefix: string,
  expectedPort: number,
): Promise<{
  root: string
  configPath: string
  testPath: string
}> {
  const root = await mkdtemp(join(tmpdir(), prefix))
  const configPath = join(root, "config.ts")
  const testPath = join(root, "config.test.js")

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
      `test("config port is ${expectedPort}", async () => {`,
      '  const content = await readFile(join(__dirname, "config.ts"), "utf8")',
      `  assert.match(content, /port:\\s*${expectedPort}/)`,
      "})",
      "",
    ].join("\n"),
    "utf8",
  )

  return { root, configPath, testPath }
}

console.log("========== Integration 05 · Session / Context / Recovery ==========")

// ---------------------------------------------------------------------------
// Case A · Session + Context continuity across Runs
// ---------------------------------------------------------------------------
console.log("\n========== Case A · Cross-Run Continuity ==========")

const continuityWorkspace = await createWorkspace(
  "yak-integration-05-continuity-",
  8080,
)

try {
  const llm = new DeepSeekToolProvider({ apiKey, baseUrl, model })
  const readTool = createWorkspaceReadFileTool(continuityWorkspace.root)
  const writeTool = createWorkspaceWriteFileTool(continuityWorkspace.root)
  const runTestTool = createRunTestTool(continuityWorkspace.root)
  const permissionRuntime = createPermissionRuntime({
    tools: [writeTool],
    workspaceRoot: continuityWorkspace.root,
    rules: createIntegrationPermissionRules(),
  })
  const codingAgent = createMultiStepCodingAgent({
    llm,
    readTool,
    writeTool,
    runTestTool,
    permissionRuntime,
    systemPrompt,
    projectContext: "工作区包含 config.ts 和 config.test.js。",
    maxSteps: 8,
  })
  const sessionStore = createSessionStore()
  const continuityAgent = createContinuityAgent({
    codingAgent,
    sessionStore,
    systemPrompt,
    projectContext: "工作区包含 config.ts 和 config.test.js。",
    defaultMaxSteps: 8,
    snapshotFiles: [
      continuityWorkspace.configPath,
      continuityWorkspace.testPath,
    ],
    compaction: {
      tokenBudget: 12_000,
      keepHotUnits: 2,
      apiKey,
      baseUrl,
      model,
    },
  })

  const sessionId = "integration-05-continuity"

  const run1 = await driveToDone(
    continuityAgent,
    await continuityAgent.start({
      sessionId,
      prompt: "把 config.ts 里的 port 从 3000 改成 8080，并运行测试确认通过。",
    }),
  )

  const afterRun1 = await readFile(continuityWorkspace.configPath, "utf8")
  const messagesAfterRun1 = continuityAgent.getSession(sessionId).messages.length

  console.log(`run1 answer          : ${run1.answer}`)
  console.log(`run1 session messages: ${messagesAfterRun1}`)
  console.log(`run1 compacted       : ${run1.contextStats.compacted}`)

  if (!afterRun1.includes("8080") || messagesAfterRun1 === 0) {
    throw new Error("Run 1 did not update config.ts or persist Session history")
  }

  const run2 = await driveToDone(
    continuityAgent,
    await continuityAgent.start({
      sessionId,
      prompt: "刚才那个文件里的 port 当前是多少？请先读取真实文件再回答，只告诉我文件名和值。",
    }),
  )

  const messagesAfterRun2 = continuityAgent.getSession(sessionId).messages.length
  const readInRun2 = run2.trace.some((item) => item.toolName === "read_file")

  console.log(`run2 answer          : ${run2.answer}`)
  console.log(`run2 selected units  : ${run2.contextStats.selectedUnits}`)
  console.log(`run2 session messages: ${messagesAfterRun2}`)

  if (
    !readInRun2 ||
    !run2.answer.includes("8080") ||
    !run2.answer.includes("config.ts") ||
    run2.contextStats.selectedUnits < 1 ||
    messagesAfterRun2 <= messagesAfterRun1
  ) {
    throw new Error("Run 2 did not continue from Session / Context correctly")
  }
} finally {
  await rm(continuityWorkspace.root, { recursive: true, force: true })
  console.log(`cleanup continuity   : removed ${continuityWorkspace.root}`)
}

// ---------------------------------------------------------------------------
// Case B/C · deterministic Recovery: Resume and Rollback
// ---------------------------------------------------------------------------
async function runRecoveryCase(mode: "resume" | "rollback") {
  console.log(`\n========== Recovery · ${mode.toUpperCase()} ==========`)

  const workspace = await createWorkspace(
    `yak-integration-05-${mode}-`,
    9999,
  )

  try {
    const llm = new ScriptedRecoveryProvider()
    const readTool = createWorkspaceReadFileTool(workspace.root)
    const writeTool = createWorkspaceWriteFileTool(workspace.root)
    const runTestTool = createRunTestTool(workspace.root)
    const permissionRuntime = createPermissionRuntime({
      tools: [writeTool],
      workspaceRoot: workspace.root,
      rules: createIntegrationPermissionRules(),
    })
    const codingAgent = createMultiStepCodingAgent({
      llm,
      readTool,
      writeTool,
      runTestTool,
      permissionRuntime,
      systemPrompt,
      maxSteps: 3,
    })
    const sessionStore = createSessionStore()
    const continuityAgent = createContinuityAgent({
      codingAgent,
      sessionStore,
      systemPrompt,
      defaultMaxSteps: 3,
      snapshotFiles: [workspace.configPath, workspace.testPath],
      compaction: {
        tokenBudget: 50_000,
        keepHotUnits: 1,
        apiKey: "unused-within-budget",
        baseUrl: "http://unused",
        model: "unused",
      },
    })

    const sessionId = `integration-05-${mode}`
    let result = await continuityAgent.start({
      sessionId,
      prompt: "把 config.ts 的 port 改成 9999，并运行测试。",
      maxSteps: 3,
    })

    if (result.status !== "approval_required") {
      throw new Error(`Expected approval_required, received ${result.status}`)
    }

    result = await continuityAgent.resumeApproval(result.pending, "approve")

    if (result.status !== "recovery_required") {
      throw new Error(`Expected recovery_required, received ${result.status}`)
    }

    const afterWrite = await readFile(workspace.configPath, "utf8")
    const sessionBeforeRecovery = continuityAgent.getSession(sessionId).messages.length

    console.log(`after partial run     : ${afterWrite.trim()}`)
    console.log(`session before recover: ${sessionBeforeRecovery}`)

    if (!afterWrite.includes("9999") || sessionBeforeRecovery !== 0) {
      throw new Error("Partial Run should modify workspace but not commit Session")
    }

    if (mode === "resume") {
      const resumed = await continuityAgent.resumeRecovery(result.pending, 2)

      if (resumed.status !== "done") {
        throw new Error(`Resume did not finish: ${resumed.status}`)
      }

      const writeCount = resumed.trace.filter(
        (item) => item.toolName === "write_file",
      ).length
      const testPassed = resumed.trace.some(
        (item) =>
          item.toolName === "run_test" &&
          item.result.startsWith("TEST_PASSED"),
      )
      const sessionAfterResume = continuityAgent.getSession(sessionId).messages.length

      console.log(`resume answer         : ${resumed.answer}`)
      console.log(`write count           : ${writeCount}`)
      console.log(`session after resume  : ${sessionAfterResume}`)

      if (writeCount !== 1 || !testPassed || sessionAfterResume === 0) {
        throw new Error("Resume repeated side effects or failed to finish the Run")
      }
      return
    }

    const rolledBack = await continuityAgent.rollback(result.pending)
    const afterRollback = await readFile(workspace.configPath, "utf8")

    console.log(`rollback checkpoint   : ${rolledBack.checkpointId}`)
    console.log(`after rollback        : ${afterRollback.trim()}`)

    if (
      !afterRollback.includes("3000") ||
      continuityAgent.getSession(sessionId).messages.length !== 0
    ) {
      throw new Error("Rollback did not restore workspace / Session boundary")
    }
  } finally {
    await rm(workspace.root, { recursive: true, force: true })
    console.log(`cleanup ${mode.padEnd(12)}: removed ${workspace.root}`)
  }
}

await runRecoveryCase("resume")
await runRecoveryCase("rollback")

console.log("\n========== 关键观察 ==========")
console.log("Session = 跨 Run 保存完整已完成历史。")
console.log("Context = 每个新 Run 从 Session 中选择这一轮模型真正需要看到的历史。")
console.log("Compaction = Context 超预算时压缩 Cold History；本 Demo 正常路径预算足够时不会额外总结。")
console.log("不完整 Run 不写回 Session，避免 orphan tool call / 半截事实污染后续 Context。")
console.log("Resume = 保留原 CodingLoopState，从 maxSteps 停下的位置继续，不重复前面的 write_file。")
console.log("Rollback = 用本次 Run 开始前的 Checkpoint 恢复工作区，Session 仍停在上一个完整事实边界。")
console.log("01 = Skeleton；02 = Inspect；03 = Edit；04 = Loop；05 = Continuity。")
console.log("下一节 integration:06 会把这些组合能力最终收进 Minimal Coding Agent Runtime。")
