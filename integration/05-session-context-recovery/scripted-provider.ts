import type {
  ToolCapableProvider,
  ToolCapableRequest,
  ToolCapableResponse,
} from "../02-read-think-answer/tool-capable-provider.js"

export class ScriptedRecoveryProvider implements ToolCapableProvider {
  readonly name = "ScriptedRecoveryProvider"
  readonly model = "scripted-recovery"

  private turn = 0

  async chat(
    _request: ToolCapableRequest,
  ): Promise<ToolCapableResponse> {
    this.turn += 1

    if (this.turn === 1) {
      return {
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "recovery-read-1",
              type: "function",
              function: {
                name: "read_file",
                arguments: JSON.stringify({ path: "config.ts" }),
              },
            },
          ],
        },
        usage: {},
      }
    }

    if (this.turn === 2) {
      return {
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "recovery-write-1",
              type: "function",
              function: {
                name: "write_file",
                arguments: JSON.stringify({
                  path: "config.ts",
                  content: "export const config = {\n  port: 9999,\n}\n",
                }),
              },
            },
          ],
        },
        usage: {},
      }
    }

    if (this.turn === 3) {
      return {
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "recovery-test-1",
              type: "function",
              function: {
                name: "run_test",
                arguments: "{}",
              },
            },
          ],
        },
        usage: {},
      }
    }

    if (this.turn === 4) {
      return {
        message: {
          role: "assistant",
          content: "config.ts 已修改为 port 9999，并且测试通过。",
        },
        usage: {},
      }
    }

    throw new Error(`ScriptedRecoveryProvider has no turn ${this.turn}`)
  }
}
