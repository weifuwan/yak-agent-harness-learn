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
  reference: string
}

type ComponentImplementation = {
  id: string
  source: string
  exportName: string
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

const implementations: ComponentImplementation[] = [
  { id: "ui.page", source: "src/components/Page.tsx", exportName: "Page" },
  { id: "ui.card", source: "src/components/Card.tsx", exportName: "Card" },
  { id: "ui.stat-card", source: "src/components/StatCard.tsx", exportName: "StatCard" },
  { id: "ui.data-table", source: "src/components/DataTable.tsx", exportName: "DataTable" },
  { id: "ui.status-badge", source: "src/components/StatusBadge.tsx", exportName: "StatusBadge" },
  { id: "ui.button", source: "src/components/Button.tsx", exportName: "Button" },
  { id: "ui.input", source: "src/components/Input.tsx", exportName: "Input" },
  { id: "ui.select", source: "src/components/Select.tsx", exportName: "Select" },
  { id: "ui.dialog", source: "src/components/Dialog.tsx", exportName: "Dialog" },
  { id: "ui.tabs", source: "src/components/Tabs.tsx", exportName: "Tabs" },
]

const implementationById = new Map(
  implementations.map((implementation) => [implementation.id, implementation]),
)

const library: ComponentDefinition[] = [
  {
    name: "Page",
    description: "页面根容器，用于承载一个完整页面的主要内容。",
    props: {
      title: { type: "string", required: true },
      subtitle: { type: "string" },
    },
    reference: "ui.page",
  },
  {
    name: "Card",
    description: "内容分组容器，用于把相关信息组织成独立区域。",
    props: {
      title: { type: "string" },
    },
    reference: "ui.card",
  },
  {
    name: "StatCard",
    description: "用于展示单个关键统计指标及其简短状态信息。",
    props: {
      label: { type: "string", required: true },
      value: { type: "string", required: true },
      tone: {
        type: "string",
        enum: ["default", "success", "warning", "danger"],
      },
    },
    reference: "ui.stat-card",
  },
  {
    name: "DataTable",
    description: "用于展示结构化、多行、多列的数据集合。",
    props: {
      columns: { type: "string[]", required: true },
      striped: { type: "boolean" },
    },
    reference: "ui.data-table",
  },
  {
    name: "StatusBadge",
    description: "用于展示简短状态，例如运行中、成功、失败。",
    props: {
      status: {
        type: "string",
        required: true,
        enum: ["running", "success", "failed", "paused"],
      },
      text: { type: "string" },
    },
    reference: "ui.status-badge",
  },
  {
    name: "Button",
    description: "用于触发明确的用户操作。",
    props: {
      label: { type: "string", required: true },
      action: { type: "string", required: true },
      variant: {
        type: "string",
        enum: ["primary", "secondary", "danger"],
      },
    },
    reference: "ui.button",
  },
  {
    name: "Input",
    description: "用于输入自由文本，例如名称或搜索关键字。",
    props: {
      name: { type: "string", required: true },
      placeholder: { type: "string" },
    },
    reference: "ui.input",
  },
  {
    name: "Select",
    description: "用于从有限的预定义选项中选择一个值。",
    props: {
      name: { type: "string", required: true },
      options: { type: "string[]", required: true },
    },
    reference: "ui.select",
  },
  {
    name: "Dialog",
    description: "用于需要用户集中处理或确认的模态交互。",
    props: {
      title: { type: "string", required: true },
      open: { type: "boolean", required: true },
    },
    reference: "ui.dialog",
  },
  {
    name: "Tabs",
    description: "用于在同一区域的多个并列视图之间切换。",
    props: {
      items: { type: "string[]", required: true },
      activeKey: { type: "string" },
    },
    reference: "ui.tabs",
  },
]

const definitionByName = new Map(
  library.map((component) => [component.name, component]),
)

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
  "reference 是 Runtime 内部信息，不会暴露给 Model。",
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
  "- component 必须来自 Library",
  "- props 必须符合 schema",
  "- 不要输出 reference",
  "- 不要生成代码",
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

function validateProps(usage: ComponentUsage): string[] {
  const definition = definitionByName.get(usage.component)
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
        "wrong type for " +
          propName +
          ": expected " +
          rule.type +
          ", got " +
          valueType(value),
      )
      continue
    }

    if (
      rule.enum &&
      typeof value === "string" &&
      !rule.enum.includes(value)
    ) {
      violations.push(
        "invalid enum for " +
          propName +
          ": " +
          value +
          " not in " +
          rule.enum.join("|"),
      )
    }
  }

  return violations
}

function collectUnresolvedReferences(definitions: ComponentDefinition[]) {
  return definitions
    .filter((definition) => !implementationById.has(definition.reference))
    .map((definition) => ({
      component: definition.name,
      reference: definition.reference,
    }))
}

function resolveReference(componentName: string) {
  const definition = definitionByName.get(componentName)

  if (!definition) {
    throw new Error("unknown component: " + componentName)
  }

  const implementation = implementationById.get(definition.reference)

  if (!implementation) {
    throw new Error(
      "unresolved component reference: " +
        componentName +
        " -> " +
        definition.reference,
    )
  }

  return {
    definition,
    implementation,
  }
}

const libraryReferenceIssues = collectUnresolvedReferences(library)

console.log("========== OpenUI Study 02.04 · Component Reference ==========")
console.log("========== Cumulative Capability ==========")
console.log("01 names       : YES")
console.log("02 metadata    : YES")
console.log("03 props       : YES")
console.log("04 reference   : NEW")
console.log()

console.log("========== Implementation Registry ==========")
console.table(implementations)

console.log("========== Library Reference Validation ==========")
console.log("definitions          : " + library.length)
console.log("unresolved references: " + libraryReferenceIssues.length)
console.log(
  "result               : " +
    (libraryReferenceIssues.length === 0 ? "VALID" : "INVALID"),
)

if (libraryReferenceIssues.length > 0) {
  console.table(libraryReferenceIssues)
  throw new Error("component library contains unresolved references")
}

const provider = new DeepSeekProvider({ apiKey, baseUrl, model })

console.log()
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

const validations = plan.components.map((usage) => {
  const propViolations = validateProps(usage)

  if (propViolations.length > 0) {
    return {
      usage,
      propViolations,
      resolved: undefined,
    }
  }

  return {
    usage,
    propViolations,
    resolved: resolveReference(usage.component),
  }
})

console.log("========== Props + Reference Validation ==========")
console.table(
  validations.map(({ usage, propViolations, resolved }) => ({
    component: usage.component,
    props: propViolations.length === 0 ? "VALID" : "INVALID",
    reference: resolved?.definition.reference ?? "-",
    source: resolved?.implementation.source ?? "-",
    result:
      propViolations.length === 0 && resolved ? "RESOLVED" : "REJECTED",
  })),
)

for (const { usage, propViolations } of validations) {
  if (propViolations.length === 0) continue

  console.log("\n[" + usage.component + "]")
  for (const violation of propViolations) {
    console.log("- " + violation)
  }
}

const rejectedUsages = validations.filter(
  (item) => item.propViolations.length > 0 || !item.resolved,
)

console.log()
console.log("========== Runtime Decision ==========")
console.log("component usages : " + validations.length)
console.log("rejected usages  : " + rejectedUsages.length)
console.log(
  "result           : " +
    (rejectedUsages.length === 0 ? "ACCEPTED" : "REJECTED"),
)

const localInvalidPropsCase: ComponentUsage = {
  component: "Button",
  purpose: "验证 04 仍然保留 03 的 Props Schema 确定性。",
  props: {
    label: 123,
    action: "create-task",
    variant: "rainbow",
  },
}

const localPropViolations = validateProps(localInvalidPropsCase)

console.log()
console.log("========== Local Invalid Props Case ==========")
for (const violation of localPropViolations) {
  console.log("- " + violation)
}
console.log(
  "result : " +
    (localPropViolations.length === 0 ? "ACCEPTED" : "REJECTED"),
)

if (localPropViolations.length === 0) {
  throw new Error("invalid props case unexpectedly passed")
}

const brokenDefinition: ComponentDefinition = {
  name: "BrokenButton",
  description: "故意构造的错误组件定义。",
  props: {},
  reference: "ui.missing-button",
}

const brokenReferenceIssues = collectUnresolvedReferences([brokenDefinition])

console.log()
console.log("========== Local Broken Reference Case ==========")
console.table(brokenReferenceIssues)
console.log("issues : " + brokenReferenceIssues.length)
console.log(
  "result : " +
    (brokenReferenceIssues.length === 0 ? "RESOLVED" : "UNRESOLVED"),
)

if (brokenReferenceIssues.length !== 1) {
  throw new Error("broken reference case should contain exactly one issue")
}

console.log()
console.log("========== What Can We Validate? ==========")
console.table([
  { capability: "Component Name", result: "YES" },
  { capability: "Component Metadata", result: "YES" },
  { capability: "Props Schema", result: "YES" },
  { capability: "Reference Integrity", result: "YES" },
  { capability: "Resolve To Implementation", result: "YES" },
  { capability: "Group Scope", result: "NEXT_STEP" },
  { capability: "React Render", result: "NO" },
])

console.log("========== Observation ==========")
console.log(
  "04 不是用 Reference 替换 Props Schema，而是在 01～03 的确定性上继续增加实现映射。",
)
console.log(
  "Model 只选择抽象组件并填写合法 props；Runtime 决定 reference 最终指向哪个真实实现。",
)
console.log(
  "下一节 05 · Component Groups 会在这套完整 Definition 上继续增加 group，用来缩小每轮模型的组件选择空间。",
)
