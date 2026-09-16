export type ToolParameters = Record<string, unknown>

export interface Tool {
  readonly name: string
  readonly description: string
  readonly parameters: ToolParameters

  execute(rawArguments: string): Promise<string>
}

export type ToolCall = {
  id?: string
  type?: string
  function?: {
    name?: string
    arguments?: string
  }
}

export type AssistantMessage = {
  role: "assistant"
  content?: string | null
  tool_calls?: ToolCall[]
}
