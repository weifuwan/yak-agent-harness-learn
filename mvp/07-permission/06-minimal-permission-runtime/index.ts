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
import { createLearningPolicy } from "../05-policy-precedence/policy-precedence.js"
import {
  createPermissionRuntime,
  type PermissionApprovalRequest,
} from "./permission-runtime.js"

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

const demoRoot = await mkdtemp(join(tmpdir(), "yak-permission-06-"))
const workspaceRoot = join(demoRoot, "workspace")
const notesPath = join(workspaceRoot, "notes.txt")
const approvePath = join(workspaceRoot, "src", "approved.txt")
const rejectPath = join(workspaceRoot, "src", "rejected.txt")
const deniedPath = join(workspaceRoot, ".env")

await mkdir(join(workspaceRoot, "src"), { recursive: true })
await writeFile(notesPath, "PERMISSION-06-ALLOW", "utf8")

const permissionRuntime = createPermissionRuntime({
  tools: [readFileTool, writeFileTool],
  workspaceRoot,
  rules: createLearningPolicy(),
})

console.log("========== Permission 06 · Minimal Permission Runtime ==========")
console.log("调用方只使用 start() / resume()；Scope、Rule Match、Precedence 都收进 Runtime。")

async function requireApproval(
  toolCall: ToolCall,
): Promise<PermissionApprovalRequest> {
  const result = await permissionRuntime.start(toolCall)

  if (result.status !== "approval_required") {
    throw new Error("Expected approval_required")
  }

  console.log(`runtime status      : ${result.status}`)
  console.log(`resource            : ${result.resourcePath}`)
  console.log(`file exists         : ${await exists(result.resourcePath)}`)
  console.log("Tool 尚未执行。")

  return result.request
}

try {
  console.log("\n========== Case A · Allow ==========")
  const allowResult = await permissionRuntime.start(
    createToolCall("read_file", notesPath),
  )

  console.log(`runtime status      : ${allowResult.status}`)
  if (allowResult.status !== "executed") {
    throw new Error("Allow case expected executed")
  }
  console.log(`tool result         : ${allowResult.toolResult}`)

  console.log("\n========== Case B · Ask → Approve ==========")
  const approveRequest = await requireApproval(
    createToolCall("write_file", approvePath, {
      content: "PERMISSION-06-APPROVE",
    }),
  )

  const approved = await permissionRuntime.resume(
    approveRequest,
    "approve",
  )

  console.log(`resume status       : ${approved.status}`)
  console.log(`file exists after   : ${await exists(approvePath)}`)
  if (approved.status !== "executed" || !(await exists(approvePath))) {
    throw new Error("Approve case expected Tool execution")
  }

  console.log("\n========== Case C · Ask → Reject ==========")
  const rejectRequest = await requireApproval(
    createToolCall("write_file", rejectPath, {
      content: "PERMISSION-06-REJECT",
    }),
  )

  const rejected = await permissionRuntime.resume(
    rejectRequest,
    "reject",
  )

  console.log(`resume status       : ${rejected.status}`)
  console.log(`file exists after   : ${await exists(rejectPath)}`)
  if (rejected.status !== "blocked" || (await exists(rejectPath))) {
    throw new Error("Reject case expected blocked with no side effect")
  }

  console.log("\n========== Case D · Deny ==========")
  const denied = await permissionRuntime.start(
    createToolCall("write_file", deniedPath, {
      content: "PERMISSION-06-DENY",
    }),
  )

  console.log(`runtime status      : ${denied.status}`)
  console.log(`file exists after   : ${await exists(deniedPath)}`)
  if (denied.status !== "blocked" || (await exists(deniedPath))) {
    throw new Error("Deny case expected blocked with no side effect")
  }

  console.log("\n========== 关键观察 ==========")
  console.log("Agent Runtime 不再自己调用 matchRules() / resolveDecision()。")
  console.log("start() 统一返回 executed / approval_required / blocked。")
  console.log("resume() 只处理外部 approve / reject 后的恢复执行。")
  console.log("Permission Runtime 内部负责 Scope + Policy + Approval + Tool Execution。")
  console.log("01 Unrestricted → 02 Gate → 03 Approval → 04 Scope → 05 Policy → 06 Runtime。")
  console.log("Permission 阶段到这里封板。")
} finally {
  await rm(demoRoot, { recursive: true, force: true })
  console.log(`\ncleanup             : removed ${demoRoot}`)
}
