import { DeepSeekProvider } from "../../../../mvp/01-llm/07-unified-llm-interface/deepseek-provider.js"

type JsonObject = Record<string, unknown>

type ComponentMetadata = {
  name: string
  description: string
}

type ComponentUsage = {
  component: string
  purpose: string
}

type UiPlan = {
  page: string
  components: ComponentUsage[]
}

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").trim()
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

const library: ComponentMetadata[] = [
  { name: "Page", description: "页面根容器，用于承载一个完整页面的主要内容。" },
  { name: "Card", description: "内容分组容器，用于把相关信息组织成独立区域。" },
  { name: "StatCard", description: "用于展示单个关键统计指标及其简短状态信息。" },
  { name: "DataTable", description: "用于展示结构化、多行、多列的数据集合。" },
  { name: "StatusBadge", description: "用于展示简短状态，例如运行中、成功、失败。" },
  { name: "Button", description: "用于触发明确的用户操作。" },
  { name: "Input", description: "用于输入自由文本，例如名称或搜索关键字。" },
  { name: "Select", description: "用于从有限的预定义选项中选择一个值。" },
  { name: "Dialog", description: "用于需要用户集中处理或确认的模态交互。" },
  { name: "Tabs", description: "用于在同一区域的多个并列视图之间切换。" },
]

const byName = new Map(library.map((component) => [component.name, component]))
const allowedNames = new Set(library.map((component) => component.name))
const userRequest = "帮我做一个数据同步任务列表页面"

const libraryPrompt = library
  .map((component) => "- " + component.name + ": " + component.description)
  .join("\n")

const prompt = [
  userRequest,
  "",
  "你只能使用下面 Component Library 中声明的 UI 组件。",
  "每个组件后面的 description 是系统定义的组件语义，请根据 description 选择合适的组件。",
  "",
  libraryPrompt,
  "",
  "不能发明新的组件名。",
  "",
  "请只返回合法 JSON，不要 Markdown，不要解释：",
  "",
  "{",
  '  "page": "",',
  '  "components": [',
  "    {",
  '      "component": "",',
  '      "purpose": ""',
  "    }",
  "  ]",
  "}",
  "",
  "要求：",
  "- component 必须从 Library 中选择",
  "- purpose 用一句话说明这个组件在当前页面里的用途",
  "- 选择组件时以 Library 的 description 为依据",
  "- 不需要生成代码",
  "- 不需要描述 props",
].join("\n")

function extractJsonObject(content: string): JsonObject {
  const start = content.indexOf("{")
  const end = content.lastIndexOf("}")

  if (start < 0 || end <= start) {
    throw new Error("response does not contain a JSON object")
  }

  const parsed: unknown = JSON.parse(content.slice(start, end + 1))

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("top-level JSON value is not an object")
  }

  return parsed as JsonObject
}

function parsePlan(content: string): UiPlan {
  const data = extractJsonObject(content)

  if (typeof data.page !== "string") {
    throw new Error("page must be string")
  }

  if (!Array.isArray(data.components)) {
    throw new Error("components must be array")
  }

  const components = data.components.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("components[" + index + "] must be object")
    }

    const object = item as JsonObject

    if (typeof object.component !== "string") {
      throw new Error("components[" + index + "].component must be string")
    }

    if (typeof object.purpose !== "string") {
      throw new Error("components[" + index + "].purpose must be string")
    }

    return {
      component: object.component,
      purpose: object.purpose,
    }
  })

  return { page: data.page, components }
}

const provider = new DeepSeekProvider({
  apiKey,
  baseUrl,
  model,
})

console.log("========== OpenUI Study 02.02 · Component Metadata ==========")
console.log("provider : " + provider.name)
console.log("model    : " + provider.model)
console.log()

console.log("========== Component Library ==========")
console.table(library)

console.log("========== User Request ==========")
console.log(userRequest)
console.log()

const response = await provider.chat({
  messages: [{ role: "user", content: prompt }],
})

console.log("========== Model Output ==========")
console.log(response.content)
console.log()

const plan = parsePlan(response.content)
const usedNames = [...new Set(plan.components.map((item) => item.component))]
const unknownNames = usedNames.filter((name) => !allowedNames.has(name))
const missingMetadata = usedNames.filter((name) => !byName.get(name)?.description)

console.log("========== Library Validation ==========")
console.log("library size       : " + library.length)
console.log("used components    : " + usedNames.length)
console.log("unknown components : " + unknownNames.length)
console.log("missing metadata   : " + missingMetadata.length)

if (unknownNames.length === 0 && missingMetadata.length === 0) {
  console.log("result             : ALL_SELECTED_COMPONENTS_DESCRIBED")
}

if (unknownNames.length > 0) {
  console.log("unknown names:")
  for (const name of unknownNames) console.log("- " + name)
}

if (missingMetadata.length > 0) {
  console.log("missing descriptions:")
  for (const name of missingMetadata) console.log("- " + name)
}

console.log()
console.log("========== Metadata Lookup ==========")
console.table(
  plan.components.map((usage) => ({
    component: usage.component,
    libraryDescription: byName.get(usage.component)?.description ?? "<missing>",
    modelPurpose: usage.purpose,
  })),
)

console.log("========== What Can We Validate? ==========")
console.table([
  {
    question: "组件名是否允许？",
    result: "YES",
    reason: "Library 拥有 allowed component names。",
  },
  {
    question: "组件是否拥有系统定义的语义？",
    result: "YES",
    reason: "Library 现在拥有 description metadata。",
  },
  {
    question: "Model 是否能看到组件语义？",
    result: "YES",
    reason: "description 已注入 Prompt。",
  },
  {
    question: "所有语义使用是否能被程序自动判定？",
    result: "NO",
    reason: "description 仍是自然语言，不是可执行规则。",
  },
  {
    question: "组件 props 是否合法？",
    result: "NOT_AVAILABLE",
    reason: "还没有 Props Schema。",
  },
  {
    question: "组件对应哪个真实 React 实现？",
    result: "NOT_AVAILABLE",
    reason: "还没有 Component Reference。",
  },
])

console.log("========== Observation ==========")
console.log(
  "Component Metadata 把“组件是什么意思”从 Model 猜测，推进成 System 提供的显式语义。",
)
console.log(
  "但 description 只能帮助 Model 选择，不能定义组件可以接收哪些 props。",
)
console.log(
  "下一节 03 · Props Schema 要继续拿回：组件到底允许怎么配置。",
)