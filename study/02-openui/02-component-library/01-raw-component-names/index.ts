import { DeepSeekProvider } from "../../../../mvp/01-llm/07-unified-llm-interface/deepseek-provider.js"

type JsonObject = Record<string, unknown>

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

const componentNames = [
  "Page",
  "Card",
  "StatCard",
  "DataTable",
  "StatusBadge",
  "Button",
  "Input",
  "Select",
  "Dialog",
  "Tabs",
] as const

const allowedComponents = new Set<string>(componentNames)
const userRequest = "帮我做一个数据同步任务列表页面"

const prompt = [
  userRequest,
  "",
  "你只能使用下面这些 UI 组件：",
  "",
  ...componentNames.map((name) => "- " + name),
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
  "- component 必须从允许的组件名字中选择",
  "- purpose 用一句话说明你准备怎么使用它",
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

  return {
    page: data.page,
    components,
  }
}

const provider = new DeepSeekProvider({
  apiKey,
  baseUrl,
  model,
})

console.log("========== OpenUI Study 02.01 · Raw Component Names ==========")
console.log("========== Cumulative Capability ==========")
console.log("01 names       : NEW")
console.log()
console.log("provider : " + provider.name)
console.log("model    : " + provider.model)
console.log()
console.log("========== Component Library ==========")
console.log(componentNames.join(", "))
console.log()
console.log("========== User Request ==========")
console.log(userRequest)
console.log()

const response = await provider.chat({
  messages: [
    {
      role: "user",
      content: prompt,
    },
  ],
})

console.log("========== Model Output ==========")
console.log(response.content)
console.log()

const plan = parsePlan(response.content)

const usedNames = plan.components.map((item) => item.component)
const uniqueUsedNames = [...new Set(usedNames)]
const unknownNames = uniqueUsedNames.filter(
  (name) => !allowedComponents.has(name),
)

console.log("========== Name-Level Validation ==========")
console.log("library size       : " + componentNames.length)
console.log("used components    : " + uniqueUsedNames.length)
console.log("unknown components : " + unknownNames.length)

if (unknownNames.length > 0) {
  console.log("unknown names:")
  for (const name of unknownNames) {
    console.log("- " + name)
  }
} else {
  console.log("result             : ALL_COMPONENT_NAMES_ALLOWED")
}

const localUnknownCase = "FancyTable"
const localUnknownAllowed = allowedComponents.has(localUnknownCase)

console.log()
console.log("========== Local Unknown Component Case ==========")
console.log("component : " + localUnknownCase)
console.log("allowed   : " + (localUnknownAllowed ? "YES" : "NO"))
console.log("result    : " + (localUnknownAllowed ? "ACCEPTED" : "REJECTED"))

if (localUnknownAllowed) {
  throw new Error("unknown component case unexpectedly passed")
}

console.log()
console.log("========== Selected Components ==========")
console.table(
  plan.components.map((item) => ({
    component: item.component,
    purpose: item.purpose,
  })),
)

console.log("========== What Can We Validate? ==========")
console.table([
  {
    question: "组件名是否存在于 Library？",
    result: "YES",
    reason: "系统已经拥有 allowed component names。",
  },
  {
    question: "组件的用途是否正确？",
    result: "NOT_AVAILABLE",
    reason: "Library 只有名字，没有 description / metadata。",
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
  "Raw Component Names 拿回了第一小块确定性：系统开始拥有“允许使用哪些组件”的名单。",
)
console.log(
  "但只有名字时，Model 仍然需要自己猜组件语义，系统也无法验证它到底有没有用对。",
)
console.log(
  "下一节 02 · Component Metadata 要解决的问题就是：只有名字，不知道组件是干什么的。",
)