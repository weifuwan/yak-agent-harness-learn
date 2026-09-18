import { DeepSeekProvider } from "../../../../mvp/01-llm/07-unified-llm-interface/deepseek-provider.js"

type JsonObject = Record<string, unknown>
type PropType = "string" | "number" | "boolean" | "string[]"

type PropRule = {
  type: PropType
  required?: boolean
  enum?: string[]
}

type ComponentDefinition = {
  name: string
  description: string
  props: Record<string, PropRule>
}

type ComponentUsage = {
  component: string
  purpose: string
  props: JsonObject
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

const library: ComponentDefinition[] = [
  {
    name: "Page",
    description: "页面根容器，用于承载一个完整页面的主要内容。",
    props: {
      title: { type: "string", required: true },
      subtitle: { type: "string" },
    },
  },
  {
    name: "Card",
    description: "内容分组容器，用于把相关信息组织成独立区域。",
    props: {
      title: { type: "string" },
    },
  },
  {
    name: "StatCard",
    description: "用于展示单个关键统计指标及其简短状态信息。",
    props: {
      label: { type: "string", required: true },
      value: { type: "string", required: true },
      tone: { type: "string", enum: ["default", "success", "warning", "danger"] },
    },
  },
  {
    name: "DataTable",
    description: "用于展示结构化、多行、多列的数据集合。",
    props: {
      columns: { type: "string[]", required: true },
      striped: { type: "boolean" },
    },
  },
  {
    name: "StatusBadge",
    description: "用于展示简短状态，例如运行中、成功、失败。",
    props: {
      status: { type: "string", required: true, enum: ["running", "success", "failed", "paused"] },
      text: { type: "string" },
    },
  },
  {
    name: "Button",
    description: "用于触发明确的用户操作。",
    props: {
      label: { type: "string", required: true },
      action: { type: "string", required: true },
      variant: { type: "string", enum: ["primary", "secondary", "danger"] },
    },
  },
  {
    name: "Input",
    description: "用于输入自由文本，例如名称或搜索关键字。",
    props: {
      name: { type: "string", required: true },
      placeholder: { type: "string" },
    },
  },
  {
    name: "Select",
    description: "用于从有限的预定义选项中选择一个值。",
    props: {
      name: { type: "string", required: true },
      options: { type: "string[]", required: true },
    },
  },
  {
    name: "Dialog",
    description: "用于需要用户集中处理或确认的模态交互。",
    props: {
      title: { type: "string", required: true },
      open: { type: "boolean", required: true },
    },
  },
  {
    name: "Tabs",
    description: "用于在同一区域的多个并列视图之间切换。",
    props: {
      items: { type: "string[]", required: true },
      activeKey: { type: "string" },
    },
  },
]

const byName = new Map(library.map((component) => [component.name, component]))
const userRequest = "帮我做一个数据同步任务列表页面"

function propRuleToText(name: string, rule: PropRule): string {
  const parts = [name + ": " + rule.type]
  if (rule.required) parts.push("required")
  if (rule.enum) parts.push("enum=" + rule.enum.join("|"))
  return parts.join(", ")
}

const libraryPrompt = library
  .map((component) => {
    const props = Object.entries(component.props)
      .map(([name, rule]) => "    - " + propRuleToText(name, rule))
      .join("\n")

    return [
      "- " + component.name + ": " + component.description,
      "  props:",
      props || "    - none",
    ].join("\n")
  })
  .join("\n")

const prompt = [
  userRequest,
  "",
  "你只能使用下面 Component Library 中声明的 UI 组件和 props。",
  "description 是组件语义，props 是组件允许的配置契约。",
  "",
  libraryPrompt,
  "",
  "请只返回合法 JSON，不要 Markdown，不要解释：",
  "",
  "{",
  '  "page": "",',
  '  "components": [',
  "    {",
  '      "component": "",',
  '      "purpose": "",',
  '      "props": {}',
  "    }",
  "  ]",
  "}",
  "",
  "要求：",
  "- component 必须来自 Library",
  "- props 只能使用该组件 schema 中声明的字段",
  "- required prop 必须提供",
  "- prop 类型必须匹配",
  "- enum prop 必须使用允许值",
  "- 不需要生成代码",
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

    if (!object.props || typeof object.props !== "object" || Array.isArray(object.props)) {
      throw new Error("components[" + index + "].props must be object")
    }

    return {
      component: object.component,
      purpose: object.purpose,
      props: object.props as JsonObject,
    }
  })

  return { page: data.page, components }
}

function matchesType(value: unknown, type: PropType): boolean {
  if (type === "string") return typeof value === "string"
  if (type === "number") return typeof value === "number"
  if (type === "boolean") return typeof value === "boolean"
  if (type === "string[]") {
    return Array.isArray(value) && value.every((item) => typeof item === "string")
  }
  return false
}

function valueType(value: unknown): string {
  if (Array.isArray(value)) {
    const itemTypes = [...new Set(value.map((item) => typeof item))]
    return "array<" + itemTypes.join("|") + ">"
  }
  if (value === null) return "null"
  return typeof value
}

function validateUsage(usage: ComponentUsage): string[] {
  const definition = byName.get(usage.component)
  const violations: string[] = []

  if (!definition) {
    return ["unknown component: " + usage.component]
  }

  for (const [propName, rule] of Object.entries(definition.props)) {
    if (rule.required && !(propName in usage.props)) {
      violations.push("missing required prop: " + propName)
    }
  }

  for (const [propName, value] of Object.entries(usage.props)) {
    const rule = definition.props[propName]

    if (!rule) {
      violations.push("unknown prop: " + propName)
      continue
    }

    if (!matchesType(value, rule.type)) {
      violations.push(
        "wrong type for " + propName + ": expected " + rule.type + ", got " + valueType(value),
      )
      continue
    }

    if (rule.enum && typeof value === "string" && !rule.enum.includes(value)) {
      violations.push(
        "invalid enum for " + propName + ": " + value + " not in " + rule.enum.join("|"),
      )
    }
  }

  return violations
}

const provider = new DeepSeekProvider({ apiKey, baseUrl, model })

console.log("========== OpenUI Study 02.03 · Props Schema ==========")
console.log("provider : " + provider.name)
console.log("model    : " + provider.model)
console.log()
console.log("========== User Request ==========")
console.log(userRequest)
console.log()
console.log("========== Component Library ==========")
console.log(libraryPrompt)
console.log()

const response = await provider.chat({
  messages: [{ role: "user", content: prompt }],
})

console.log("========== Model Output ==========")
console.log(response.content)
console.log()

const plan = parsePlan(response.content)
const validations = plan.components.map((usage) => {
  const violations = validateUsage(usage)
  return { usage, violations }
})

console.log("========== Props Validation ==========")
console.table(
  validations.map(({ usage, violations }) => ({
    component: usage.component,
    props: JSON.stringify(usage.props),
    violations: violations.length,
    result: violations.length === 0 ? "VALID" : "INVALID",
  })),
)

for (const { usage, violations } of validations) {
  if (violations.length === 0) continue

  console.log("\n[" + usage.component + "]")
  for (const violation of violations) {
    console.log("- " + violation)
  }
}

const invalidUsages = validations.filter((item) => item.violations.length > 0)

console.log()
console.log("========== Runtime Decision ==========")
console.log("component usages : " + validations.length)
console.log("invalid usages   : " + invalidUsages.length)
console.log(
  "result           : " + (invalidUsages.length === 0 ? "ACCEPTED" : "REJECTED"),
)

console.log()
console.log("========== What Can We Validate? ==========")
console.table([
  { question: "组件名是否允许？", result: "YES" },
  { question: "组件是否有 description？", result: "YES" },
  { question: "Prop 名是否允许？", result: "YES" },
  { question: "Required prop 是否缺失？", result: "YES" },
  { question: "Prop 类型是否正确？", result: "YES" },
  { question: "Enum 值是否合法？", result: "YES" },
  { question: "组件用途语义是否绝对正确？", result: "NO" },
  { question: "对应哪个真实 React 组件？", result: "NOT_AVAILABLE" },
])

console.log("========== Observation ==========")
console.log(
  "Props Schema 把“组件允许怎么配置”从自然语言建议，推进成 Runtime 可以执行的验证规则。",
)
console.log(
  "现在系统不只知道组件存在，还能拒绝未知 prop、缺失 required、错误类型和非法 enum。",
)
console.log(
  "但系统仍然不知道这个抽象组件最终对应哪个真实 React 实现。",
)
console.log(
  "下一节 04 · Component Reference 要解决：Library Definition 如何连接到真实组件。",
)