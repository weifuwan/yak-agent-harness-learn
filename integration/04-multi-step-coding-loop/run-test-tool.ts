import { execFile } from "node:child_process"
import { resolve } from "node:path"
import type { Tool } from "../../mvp/02-tool/07-unified-tool-interface/types.js"

function parseEmptyArguments(rawArguments: string): void {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawArguments)
  } catch {
    throw new Error(`run_test arguments are not valid JSON: ${rawArguments}`)
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("run_test arguments must be a JSON object")
  }

  if (Object.keys(parsed as Record<string, unknown>).length > 0) {
    throw new Error("run_test does not accept any arguments")
  }
}

function executeNodeTests(workspaceRoot: string): Promise<string> {
  return new Promise((resolveResult) => {
    execFile(
      process.execPath,
      ["--test"],
      {
        cwd: workspaceRoot,
        encoding: "utf8",
        timeout: 10_000,
        maxBuffer: 200_000,
      },
      (error, stdout, stderr) => {
        const output = [stdout.trim(), stderr.trim()]
          .filter(Boolean)
          .join("\n")

        if (error) {
          resolveResult(
            [
              "TEST_FAILED",
              output || error.message,
            ].join("\n"),
          )
          return
        }

        resolveResult(
          [
            "TEST_PASSED",
            output || "node --test completed successfully",
          ].join("\n"),
        )
      },
    )
  })
}

export function createRunTestTool(workspaceRoot: string): Tool {
  const normalizedRoot = resolve(workspaceRoot)

  return {
    name: "run_test",
    description: "在当前工作区运行固定的 Node.js 测试命令 `node --test`。不接受任意 shell 命令。",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },

    async execute(rawArguments) {
      parseEmptyArguments(rawArguments)
      return executeNodeTests(normalizedRoot)
    },
  }
}
