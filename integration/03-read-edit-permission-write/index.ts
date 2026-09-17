import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createPermissionRuntime } from "../../mvp/07-permission/06-minimal-permission-runtime/permission-runtime.js"
import { DeepSeekToolProvider } from "../02-read-think-answer/tool-capable-provider.js"
import { createEditableCodingAgent } from "./mini-coding-agent.js"
import {
  createIntegrationPermissionRules,
  createWorkspaceReadFileTool,
  createWorkspaceWriteFileTool,
} from "./workspace-tools.js"

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
  "用户要求修改文件时，必须先使用 read_file 读取目标文件。",
  "读取以后，根据真实内容使用 write_file 写入完整文件内容。",
  "write_file.content 必须是纯文件文本，不要带 Markdown 代码围栏。",
  "只有 Tool Result 明确表示写入成功后，才能说修改已经完成。",
  "如果写入被拒绝或阻止，要明确告诉用户文件没有被修改。",
].join("\n")

const prompt = "请把 config.ts 里的 port 从 3000 改成 8080。"

async function runCase(approval: "approve" | "reject") {
  const workspaceRoot = await mkdtemp(
    join(tmpdir(), `yak-integration-03-${approval}-`),
  )
  const configPath = join(workspaceRoot, "config.ts")

  await writeFile(
    configPath,
    "export const config = {\n  port: 3000,\n}\n",
    "utf8",
  )

  const readTool = createWorkspaceReadFileTool(workspaceRoot)
  const writeTool = createWorkspaceWriteFileTool(workspaceRoot)
  const permissionRuntime = createPermissionRuntime({
    tools: [writeTool],
    workspaceRoot,
    rules: createIntegrationPermissionRules(),
  })

  const agent = createEditableCodingAgent({
    llm,
    readTool,
    writeTool,
    permissionRuntime,
    systemPrompt,
    projectContext: "工作区里有 config.ts。只修改用户明确要求的文件。",
  })

  console.log(`\n========== Case · ${approval.toUpperCase()} ==========`)
  console.log(`before:\n${await readFile(configPath, "utf8")}`)

  try {
    const started = await agent.start({ prompt })

    if (started.status !== "approval_required") {
      throw new Error(
        `Expected approval_required, received ${started.status}/${started.outcome}`,
      )
    }

    const beforeApproval = await readFile(configPath, "utf8")

    console.log("permission          : approval_required")
    console.log(`resource            : ${started.request.resourcePath}`)
    console.log(
      `matched rules       : ${started.request.matchedRules
        .map((rule) => `${rule.id}:${rule.decision}`)
        .join(", ")}`,
    )
    console.log(
      `changed before approval: ${beforeApproval.includes("8080")}`,
    )

    if (!beforeApproval.includes("3000") || beforeApproval.includes("8080")) {
      throw new Error("File changed before approval")
    }

    const completed = await agent.resume(started.pending, approval)
    const afterApproval = await readFile(configPath, "utf8")

    console.log(`approval            : ${approval}`)
    console.log(`outcome             : ${completed.outcome}`)
    console.log(`answer              : ${completed.answer}`)
    console.log(`after:\n${afterApproval}`)

    if (approval === "reject") {
      if (
        completed.outcome !== "rejected" ||
        !afterApproval.includes("3000") ||
        afterApproval.includes("8080")
      ) {
        throw new Error("Reject case unexpectedly modified config.ts")
      }
    } else if (
      completed.outcome !== "executed" ||
      !afterApproval.includes("8080")
    ) {
      throw new Error("Approve case did not update config.ts to 8080")
    }
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true })
    console.log(`cleanup             : removed ${workspaceRoot}`)
  }
}

console.log("========== Integration 03 · Read → Edit → Permission → Write ==========")
console.log(`model               : ${llm.model}`)
console.log(`prompt              : ${prompt}`)
console.log("模型可以提出 write_file，但真正写入必须由 Permission Runtime 放行。")

await runCase("reject")
await runCase("approve")

console.log("\n========== 关键观察 ==========")
console.log("read_file 是获取事实；write_file 是产生副作用，两者风险不同。")
console.log("LLM 只负责提出 Tool Call，不拥有最终写入权。")
console.log("Permission = ask 时，start() 绝不会执行 write_file。")
console.log("reject 后文件保持原样；approve 后才真正写入。")
console.log("workspace 外路径被 hard deny，即使 approve 也不能写出去。")
console.log("01 = Skeleton；02 = Inspect；03 = Edit。")
console.log("下一节 integration:04 才进入多个 Tool / 多 Step 的真正 Coding Loop。")
