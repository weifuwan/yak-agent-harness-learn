import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  writeFileTool,
  type Tool,
  type ToolCall,
} from "../01-no-permission/unrestricted-runtime.js"
import {
  createLearningPolicy,
  executeToolCallWithPolicy,
  resolvePolicy,
  type PermissionRule,
} from "./policy-precedence.js"

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function createToolCall(
  name: string,
  path: string,
  extraArguments: Record<string, unknown> = {},
): ToolCall {
  return {
    id: `call-${name}-${Math.random().toString(36).slice(2, 8)}`,
    type: "function",
    function: {
      name,
      arguments: JSON.stringify({
        path,
        ...extraArguments,
      }),
    },
  }
}

const readFileTool: Tool = {
  name: "read_file",

  async execute(rawArguments: string): Promise<string> {
    const value = JSON.parse(rawArguments) as { path?: unknown }

    if (typeof value.path !== "string" || !value.path.trim()) {
      throw new Error("read_file.path must be a non-empty string")
    }

    return readFile(value.path, "utf8")
  },
}

function formatRules(rules: Array<{ id: string; decision: string }>): string {
  return rules.map((rule) => `${rule.id}=${rule.decision}`).join(", ") || "(none)"
}

async function runCase(options: {
  label: string
  toolCall: ToolCall
  tools: Tool[]
  workspaceRoot: string
  rules: PermissionRule[]
}) {
  const resolution = resolvePolicy({
    toolCall: options.toolCall,
    workspaceRoot: options.workspaceRoot,
    rules: options.rules,
  })

  console.log(`\n========== ${options.label} ==========`)
  console.log(`tool               : ${options.toolCall.function.name}`)
  console.log(`resource           : ${resolution.resourcePath}`)
  console.log(`matched rules      : ${formatRules(resolution.matchedRules)}`)
  console.log(`final decision     : ${resolution.decision}`)
  console.log(`reason             : ${resolution.reason}`)
  console.log(`file exists before : ${await exists(resolution.resourcePath)}`)

  const result = await executeToolCallWithPolicy({
    toolCall: options.toolCall,
    tools: options.tools,
    workspaceRoot: options.workspaceRoot,
    rules: options.rules,
  })

  console.log(`runtime status     : ${result.status}`)
  console.log(`file exists after  : ${await exists(result.resourcePath)}`)

  if (result.status === "executed") {
    console.log(`tool result        : ${result.toolResult}`)
  } else {
    console.log(`runtime reason     : ${result.reason}`)
  }

  return {
    resolution,
    result,
  }
}

const demoRoot = await mkdtemp(join(tmpdir(), "yak-permission-05-"))
const workspaceRoot = join(demoRoot, "workspace")
const notesPath = join(workspaceRoot, "notes.txt")
const askPath = join(workspaceRoot, "src", "app.txt")
const deniedPath = join(workspaceRoot, ".env")

await mkdir(join(workspaceRoot, "src"), { recursive: true })
await writeFile(notesPath, "PERMISSION-05-ALLOW", "utf8")

const rules = createLearningPolicy()

console.log("========== Permission 05 · Policy Precedence ==========")
console.log("当前学习版人为规定优先级：deny > ask > allow。")
console.log("重点观察：先收集所有命中 Rule，再把多个 Decision 收敛成一个最终 Decision。")

try {
  const allowCase = await runCase({
    label: "Case A · Only Allow Matches",
    toolCall: createToolCall("read_file", notesPath),
    tools: [readFileTool, writeFileTool],
    workspaceRoot,
    rules,
  })

  const askCase = await runCase({
    label: "Case B · Allow + Ask",
    toolCall: createToolCall("write_file", askPath, {
      content: "PERMISSION-05-ASK",
    }),
    tools: [readFileTool, writeFileTool],
    workspaceRoot,
    rules,
  })

  const denyCase = await runCase({
    label: "Case C · Allow + Ask + Deny",
    toolCall: createToolCall("write_file", deniedPath, {
      content: "PERMISSION-05-DENY",
    }),
    tools: [readFileTool, writeFileTool],
    workspaceRoot,
    rules,
  })

  const allowWorked =
    allowCase.resolution.decision === "allow" &&
    allowCase.result.status === "executed"

  const askWorked =
    askCase.resolution.decision === "ask" &&
    askCase.result.status === "approval_required" &&
    !(await exists(askPath))

  const denyWorked =
    denyCase.resolution.decision === "deny" &&
    denyCase.result.status === "blocked" &&
    !(await exists(deniedPath))

  if (!allowWorked || !askWorked || !denyWorked) {
    throw new Error("Policy Precedence demo produced an unexpected result")
  }

  console.log("\n========== 关键观察 ==========")
  console.log("Case A：只命中 workspace allow → 最终 allow。")
  console.log("Case B：同时命中 allow + ask → ask 优先，Tool 不执行。")
  console.log("Case C：同时命中 allow + ask + deny → deny 优先，Tool 不执行。")
  console.log("Permission Rule 可以有很多条，但一次 Tool Call 最终只能得到一个 Decision。")
  console.log("04 = Scope；05 = Policy。")
  console.log("下一节 permission:06 会把 Gate / Approval / Scope / Policy 收进统一 Permission Runtime。")
} finally {
  await rm(demoRoot, { recursive: true, force: true })
  console.log(`\ncleanup            : removed ${demoRoot}`)
}
