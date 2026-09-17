import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  writeFileTool,
  type ToolCall,
} from "../01-no-permission/unrestricted-runtime.js"
import {
  checkResourceScope,
  executeToolCallWithResourceScope,
} from "./resource-scope.js"

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
  workspaceRoot: string
  targetPath: string
  content: string
}) {
  const toolCall = createWriteFileCall(options.targetPath, options.content)
  const scope = checkResourceScope(toolCall, options.workspaceRoot)

  console.log(`\n========== ${options.label} ==========`)
  console.log(`tool               : ${toolCall.function.name}`)
  console.log(`workspace root     : ${scope.workspaceRoot}`)
  console.log(`resource path      : ${scope.resourcePath}`)
  console.log(`relative path      : ${scope.relativePath}`)
  console.log(`scope decision     : ${scope.decision}`)
  console.log(`reason             : ${scope.reason}`)
  console.log(`file exists before : ${await exists(scope.resourcePath)}`)

  const result = await executeToolCallWithResourceScope(
    toolCall,
    [writeFileTool],
    options.workspaceRoot,
  )

  const existsAfter = await exists(scope.resourcePath)

  console.log(`runtime status     : ${result.status}`)
  console.log(`file exists after  : ${existsAfter}`)

  if (result.status === "executed") {
    console.log(`tool result        : ${result.toolResult}`)
    console.log(`file content       : ${await readFile(scope.resourcePath, "utf8")}`)
  } else {
    console.log(`blocked reason     : ${result.reason}`)
  }

  return {
    decision: scope.decision,
    status: result.status,
    existsAfter,
  }
}

const demoRoot = await mkdtemp(join(tmpdir(), "yak-permission-04-"))
const workspaceRoot = join(demoRoot, "workspace")
const outsideRoot = join(demoRoot, "outside")

await mkdir(workspaceRoot, { recursive: true })
await mkdir(outsideRoot, { recursive: true })

const insidePath = join(workspaceRoot, "src", "inside.txt")
const outsidePath = join(outsideRoot, "outside.txt")

console.log("========== Permission 04 · Resource Scope ==========")
console.log("同一个 write_file Tool，只改变它要操作的具体资源路径。")
console.log("这一节只研究 workspace 内 / 外，不引入 .env 特例或 Policy Precedence。")

try {
  const inside = await runCase({
    label: "Case A · Inside Workspace",
    workspaceRoot,
    targetPath: insidePath,
    content: "PERMISSION-04-INSIDE",
  })

  const outside = await runCase({
    label: "Case B · Outside Workspace",
    workspaceRoot,
    targetPath: outsidePath,
    content: "PERMISSION-04-OUTSIDE",
  })

  if (
    inside.decision !== "allow" ||
    inside.status !== "executed" ||
    !inside.existsAfter ||
    outside.decision !== "deny" ||
    outside.status !== "blocked" ||
    outside.existsAfter
  ) {
    throw new Error("Resource Scope demo produced an unexpected result")
  }

  console.log("\n========== 关键观察 ==========")
  console.log("两个场景调用的都是同一个 write_file Tool。")
  console.log("真正改变 Permission Decision 的，是 Tool Arguments 里的 path。")
  console.log("workspace 内 → allow → Tool 执行并产生副作用。")
  console.log("workspace 外 → deny  → Tool 不执行，没有副作用。")
  console.log("所以 Permission 不能永远只看 Tool Name，还要看这次操作作用在哪个 Resource。")
  console.log("03 = Approval；04 = Scope。")
  console.log("下一节 permission:05 才研究：多条规则同时命中时，最终到底听谁的？")
} finally {
  await rm(demoRoot, { recursive: true, force: true })
  console.log(`\ncleanup            : removed ${demoRoot}`)
}
