import { access, mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  executeToolCall,
  writeFileTool,
  type ToolCall,
} from "./unrestricted-runtime.js"

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const demoDir = await mkdtemp(join(tmpdir(), "yak-permission-01-"))
const targetPath = join(demoDir, "unrestricted.txt")
const expectedContent = "PERMISSION-01: tool executed without a permission check."

// 假设这是 LLM 已经返回的 Tool Call。
// permission:01 不研究“模型为什么选择这个 Tool”，只研究 Tool Call 到 Execution 之间发生了什么。
const modelToolCall: ToolCall = {
  id: "call-permission-0101",
  type: "function",
  function: {
    name: "write_file",
    arguments: JSON.stringify({
      path: targetPath,
      content: expectedContent,
    }),
  },
}

console.log("========== Permission 01 · No Permission ==========")
console.log("假设模型已经返回一个 write_file Tool Call。")
console.log("当前 Runtime 没有 Permission Layer：找到 Tool 后直接 execute()。")
console.log("")
console.log(`tool                : ${modelToolCall.function.name}`)
console.log(`target              : ${targetPath}`)
console.log(`permission check    : NONE`)
console.log(`file exists before  : ${await exists(targetPath)}`)

try {
  const result = await executeToolCall(modelToolCall, [writeFileTool])

  console.log(`tool result         : ${result}`)
  console.log(`file exists after   : ${await exists(targetPath)}`)
  console.log(`file content        : ${await readFile(targetPath, "utf8")}`)

  console.log("\n========== 关键观察 ==========")
  console.log("Tool Call 一旦产生，Runtime 直接执行 write_file。")
  console.log("这里没有 allow / ask / deny，也没有用户确认。")
  console.log("Tool 的参数校验只是输入校验，不等于 Permission。")
  console.log("所以当前 Agent 的实际能力边界，几乎就是 Tool Registry 的能力边界。")
  console.log("permission:01 只暴露这个问题，不提前解决。")
  console.log("下一节 permission:02 才第一次在 Tool Call 和 Tool Execution 中间加入 allow / deny Gate。")
} finally {
  await rm(demoDir, { recursive: true, force: true })
  console.log(`\ncleanup             : removed ${demoDir}`)
}
