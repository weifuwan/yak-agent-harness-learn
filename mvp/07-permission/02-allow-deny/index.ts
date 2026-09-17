import { access, mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  writeFileTool,
  type ToolCall,
} from "../01-no-permission/unrestricted-runtime.js"
import {
  checkPermission,
  executeToolCallWithPermission,
  type PermissionPolicy,
} from "./permission-gate.js"

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function createWriteFileCall(path: string, content: string): ToolCall {
  return {
    id: `call-${content.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    type: "function",
    function: {
      name: "write_file",
      arguments: JSON.stringify({ path, content }),
    },
  }
}

async function runCase(options: {
  label: string
  targetPath: string
  content: string
  policy: PermissionPolicy
}) {
  const toolCall = createWriteFileCall(options.targetPath, options.content)
  const permission = checkPermission(toolCall, options.policy)

  console.log(`\n========== ${options.label} ==========`)
  console.log(`tool               : ${toolCall.function.name}`)
  console.log(`permission decision: ${permission.decision}`)
  console.log(`reason             : ${permission.reason}`)
  console.log(`file exists before : ${await exists(options.targetPath)}`)

  const result = await executeToolCallWithPermission(
    toolCall,
    [writeFileTool],
    options.policy,
  )

  const existsAfter = await exists(options.targetPath)

  console.log(`runtime status     : ${result.status}`)
  console.log(`file exists after  : ${existsAfter}`)

  if (result.status === "executed") {
    console.log(`tool result        : ${result.toolResult}`)
    console.log(`file content       : ${await readFile(options.targetPath, "utf8")}`)
  } else {
    console.log(`blocked reason     : ${result.reason}`)
  }

  return {
    decision: permission.decision,
    status: result.status,
    existsAfter,
  }
}

const demoDir = await mkdtemp(join(tmpdir(), "yak-permission-02-"))
const allowedPath = join(demoDir, "allowed.txt")
const deniedPath = join(demoDir, "denied.txt")

console.log("========== Permission 02 · Allow / Deny ==========")
console.log("同一个 write_file Tool，只改变 Permission Policy。")
console.log("这一节只研究 allow / deny，不引入 ask、路径 Scope 或规则优先级。")

try {
  const allowed = await runCase({
    label: "Case A · Allow",
    targetPath: allowedPath,
    content: "PERMISSION-02-ALLOW",
    policy: {
      write_file: "allow",
    },
  })

  const denied = await runCase({
    label: "Case B · Deny",
    targetPath: deniedPath,
    content: "PERMISSION-02-DENY",
    policy: {
      write_file: "deny",
    },
  })

  if (
    allowed.status !== "executed" ||
    !allowed.existsAfter ||
    denied.status !== "blocked" ||
    denied.existsAfter
  ) {
    throw new Error("Permission Gate demo produced an unexpected result")
  }

  console.log("\n========== 关键观察 ==========")
  console.log("permission:01：Tool Call 找到 Tool 后直接 execute()。")
  console.log("permission:02：Tool Call 和 Tool Execution 中间第一次加入 Permission Gate。")
  console.log("allow → Tool 真正执行并产生副作用。")
  console.log("deny  → Tool 完全不执行，目标文件不会出现。")
  console.log("模型负责提出 Tool Call，但 Runtime 决定这个动作能不能真正发生。")
  console.log("02 = Gate。")
  console.log("下一节 permission:03 才会加入第三种状态 ask：需要用户批准后才能执行。")
} finally {
  await rm(demoDir, { recursive: true, force: true })
  console.log(`\ncleanup            : removed ${demoDir}`)
}
