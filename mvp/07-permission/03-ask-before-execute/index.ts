import { access, mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  writeFileTool,
  type ToolCall,
} from "../01-no-permission/unrestricted-runtime.js"
import {
  resumeToolCallAfterApproval,
  startToolCallWithPermission,
  type ApprovalDecision,
  type PermissionPolicy,
  type PermissionRequest,
} from "./approval-gate.js"

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

async function runAllowCase(path: string) {
  const toolCall = createWriteFileCall(path, "PERMISSION-03-ALLOW")
  const policy: PermissionPolicy = { write_file: "allow" }

  console.log("\n========== Case A · Allow ==========")
  console.log(`file exists before   : ${await exists(path)}`)

  const result = await startToolCallWithPermission(
    toolCall,
    [writeFileTool],
    policy,
  )

  console.log(`runtime status       : ${result.status}`)
  console.log(`file exists after    : ${await exists(path)}`)

  if (result.status !== "executed") {
    throw new Error("Allow case expected direct execution")
  }

  console.log(`tool result          : ${result.toolResult}`)
  console.log(`file content         : ${await readFile(path, "utf8")}`)
}

async function startAsk(path: string, content: string): Promise<PermissionRequest> {
  const toolCall = createWriteFileCall(path, content)
  const policy: PermissionPolicy = { write_file: "ask" }

  console.log(`file exists before ask: ${await exists(path)}`)

  const result = await startToolCallWithPermission(
    toolCall,
    [writeFileTool],
    policy,
  )

  console.log(`runtime status        : ${result.status}`)
  console.log(`file exists after ask : ${await exists(path)}`)

  if (result.status !== "approval_required") {
    throw new Error("Ask case expected approval_required")
  }

  console.log(`approval request id   : ${result.request.id}`)
  console.log(`approval reason       : ${result.request.reason}`)
  console.log("Tool 尚未执行，副作用被暂停。")

  return result.request
}

async function resolveAsk(options: {
  label: string
  path: string
  content: string
  approval: ApprovalDecision
}) {
  console.log(`\n========== ${options.label} ==========`)

  const request = await startAsk(options.path, options.content)

  console.log(`external decision     : ${options.approval}`)

  const result = await resumeToolCallAfterApproval(
    request,
    options.approval,
    [writeFileTool],
  )

  const existsAfterResolution = await exists(options.path)

  console.log(`resume status         : ${result.status}`)
  console.log(`file exists after     : ${existsAfterResolution}`)

  if (result.status === "executed") {
    console.log(`tool result           : ${result.toolResult}`)
    console.log(`file content          : ${await readFile(options.path, "utf8")}`)
  } else {
    console.log(`blocked reason        : ${result.reason}`)
  }

  return {
    status: result.status,
    existsAfterResolution,
  }
}

const demoDir = await mkdtemp(join(tmpdir(), "yak-permission-03-"))
const allowPath = join(demoDir, "allow.txt")
const approvePath = join(demoDir, "ask-approve.txt")
const rejectPath = join(demoDir, "ask-reject.txt")

console.log("========== Permission 03 · Ask Before Execute ==========")
console.log("ask 不等于 allow：它先返回 approval_required，Tool 暂停执行。")
console.log("批准结果由外部传入，模型不能自己批准自己的 Tool Call。")

try {
  await runAllowCase(allowPath)

  const approved = await resolveAsk({
    label: "Case B · Ask → Approve",
    path: approvePath,
    content: "PERMISSION-03-APPROVE",
    approval: "approve",
  })

  const rejected = await resolveAsk({
    label: "Case C · Ask → Reject",
    path: rejectPath,
    content: "PERMISSION-03-REJECT",
    approval: "reject",
  })

  if (
    approved.status !== "executed" ||
    !approved.existsAfterResolution ||
    rejected.status !== "blocked" ||
    rejected.existsAfterResolution
  ) {
    throw new Error("Ask approval demo produced an unexpected result")
  }

  console.log("\n========== 关键观察 ==========")
  console.log("allow → Tool 立即执行。")
  console.log("ask   → 第一次只产生 approval_required，Tool 绝不执行。")
  console.log("approve → resume 后执行 Tool。")
  console.log("reject  → resume 后 blocked，仍然没有副作用。")
  console.log("Approval 是外部决定，不是模型自己的第二次 Tool Call。")
  console.log("02 = Gate；03 = Approval。")
  console.log("下一节 permission:04 才研究：同一个 Tool 是否应该因为资源路径不同而得到不同权限？")
} finally {
  await rm(demoDir, { recursive: true, force: true })
  console.log(`\ncleanup               : removed ${demoDir}`)
}
