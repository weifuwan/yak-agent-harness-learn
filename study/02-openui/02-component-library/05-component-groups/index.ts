import { DeepSeekProvider } from "../../../../mvp/01-llm/07-unified-llm-interface/deepseek-provider.js"

type JsonObject = Record<string, unknown>
type PropType = "string" | "number" | "boolean" | "string[]"

type PropRule = {
  type: PropType
  required?: boolean
  enum?: string[]
}

type ComponentGroupId =
  | "layout"
  | "data-display"
  | "action"
  | "form"
  | "navigation"
  | "overlay"

type ComponentGroup = {
  id: ComponentGroupId
  description: string
}

type ComponentDefinition = {
  name: string
  description: string
  props: Record<string, PropRule>
  reference: string
  group: ComponentGroupId
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

const groups: ComponentGroup[] = [
  { id: "layout", description: "页面与内容结构容器。" },
  { id: "data-display", description: "表格、指标、状态等数据展示组件。" },
  { id: "action", description: "触发明确用户操作的组件。" },
  { id: "form", description: "文本输入和选项选择组件。" },
  { id: "navigation", description: "同一区域视图切换等导航组件。" },
  { id: "overlay", description: "模态层、浮层等临时交互容器。" },
]

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
    group: "layout",
  },
  {
    name: "Card",
    description: "内容分组容器，用于把相关信息组织成独立区域。",
    props: {
      title: { type: "string" },
    },
    reference: "ui.card",
    group: "layout",
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
    group: "data-display",
  },
  {
    name: "DataTable",
    description: "用于展示结构化、多行、多列的数据集合。",
    props: {
      columns: { type: "string[]", required: true },
      striped: { type: "boolean" },
    },
    reference: "ui.data-table",
    group: "data-display",
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
    group: "data-display",
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
    group: "action",
  },
  {
    name: "Input",
    description: "用于输入自由文本，例如名称或搜索关键字。",
    props: {
      name: { type: "string", required: true },
      placeholder: { type: "string" },
    },
    reference: "ui.input",
    group: "form",
  },
  {
    name: "Select",
    description: "用于从有限的预定义选项中选择一个值。",
    props: {
      name: { type: "string", required: true },
      options: { type: "string[]", required: true },
    },
    reference: "ui.select",
    group: "form",
  },
  {
    name: "Dialog",
    description: "用于需要用户集中处理或确认的模态交互。",
    props: {
      title: { type: "string", required: true },
      open: { type: "boolean", required: true },
    },
    reference: "ui.dialog",
    group: "overlay",
  },
  {
    name: "Tabs",
    description: "用于在同一区域的多个并列视图之间切换。",
    props: {
      items: { type: "string[]", required: true },
      activeKey: { type: "string" },
    },
    reference: "ui.tabs",
    group: "navigation",
  },
]

const definitionByName = new Map(
  library.map((component) => [component.name, component]),
)
const groupById = new Map(groups.map((group) => [group.id, group]))

const userRequest = "帮我做一个数据同步任务列表页面"

// 这一节只研究“如何缩小能力集合”，暂时不研究自动 Group Routing。
const activeGroups: ComponentGroupId[] = ["layout", "data-display", "action"]
const activeGroupSet = new Set<ComponentGroupId>(activeGroups)

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

function validateLibrary() {
  const violations: string[] = []

  for (const definition of library) {
    if (!groupById.has(definition.group)) {
      violations.push(
        "component " +
          definition.name +
          " uses unknown group: " +
          definition.group,
      )
    }

    if (!implementationById.has(definition.reference)) {
      violations.push(
        "component " +
          definition.name +
          " uses unresolved reference: " +
          definition.reference,
      )
    }
  }

  return violations
}

function validateUsage(usage: ComponentUsage): string[] {
  const definition = definitionByName.get(usage.component)
  const violations: string[] = []

  if (!definition) {
    return ["unknown component: " + usage.component]
  }

  if (!activeGroupSet.has(definition.group)) {
    violations.push(
      "component " +
        definition.name +
        " belongs to inactive group: " +
        definition.group,
    )
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

function selectLibraryByGroups(
  definitions: ComponentDefinition[],
  selectedGroups: ComponentGroupId[],
) {
  const selected = new Set<ComponentGroupId>(selectedGroups)

  return definitions.filter((definition) => selected.has(definition.group))
}

function propRuleToText(name: string, rule: PropRule): string {
  const parts = [name + ": " + rule.type]
  if (rule.required) parts.push("required")
  if (rule.enum) parts.push("enum=" + rule.enum.join("|"))
  return parts.join(", ")
}

const libraryIssues = validateLibrary()

console.log("========== OpenUI Study 02.05 · Component Groups ==========")
console.log("========== Cumulative Capability ==========")
console.log("01 names       : YES")
console.log("02 metadata    : YES")
console.log("03 props       : YES")
console.log("04 reference   : YES")
console.log("05 groups      : NEW")
console.log()

console.log("========== Library Validation ==========")
console.log("issues : " + libraryIssues.length)

if (libraryIssues.length > 0) {
  for (const issue of libraryIssues) {
    console.log("- " + issue)
  }

  throw new Error("component library is invalid")
}

console.log("result : VALID")
console.log()

const scopedLibrary = selectLibraryByGroups(library, activeGroups)

console.log("========== Component Groups ==========")
console.table(groups)

console.log("========== Full Component Library ==========")
console.table(
  library.map((component) => ({
    component: component.name,
    group: component.group,
    reference: component.reference,
  })),
)

console.log("========== Active Groups ==========")
console.log(activeGroups.join(", "))
console.log()

console.log("========== Scoped Component Library ==========")
console.table(
  scopedLibrary.map((component) => ({
    component: component.name,
    group: component.group,
    reference: component.reference,
  })),
)

console.log("full component count   : " + library.length)
console.log("scoped component count : " + scopedLibrary.length)
console.log(
  "hidden component count : " + (library.length - scopedLibrary.length),
)
console.log()

const libraryPrompt = scopedLibrary
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
  "你只能使用下面当前场景开放的 Component Library。",
  "没有出现在列表里的组件不能使用。",
  "",
  libraryPrompt,
  "",
  '只返回合法 JSON：{"page":"","components":[{"component":"","purpose":"","props":{}}]}',
  "",
  "- component 必须来自当前开放的 Component Library",
  "- props 必须符合 schema",
  "- 不要输出 group",
  "- 不要输出 reference",
  "- 不要生成代码",
].join("\n")

function extractJsonObject(content: string): JsonObject {
  const start = content.indexOf("{")
  const end = content.lastIndexOf("}")

  if (start < 0 || end <= start) {
    throw new Error("response does not contain JSON")
  }

  const value: unknown = JSON.parse(content.slice(start, end + 1))

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("top-level JSON must be object")
  }

  return value as JsonObject
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

const provider = new DeepSeekProvider({ apiKey, baseUrl, model })

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
  const violations = validateUsage(usage)

  if (violations.length > 0) {
    return {
      usage,
      violations,
      resolved: undefined,
    }
  }

  return {
    usage,
    violations,
    resolved: resolveReference(usage.component),
  }
})

console.log("========== Group + Props + Reference Validation ==========")
console.table(
  validations.map(({ usage, violations, resolved }) => ({
    component: usage.component,
    group: definitionByName.get(usage.component)?.group ?? "UNKNOWN",
    propsAndScope: violations.length === 0 ? "VALID" : "INVALID",
    reference: resolved?.definition.reference ?? "-",
    source: resolved?.implementation.source ?? "-",
    result:
      violations.length === 0 && resolved ? "ALLOWED" : "REJECTED",
  })),
)

for (const { usage, violations } of validations) {
  if (violations.length === 0) continue

  console.log("\n[" + usage.component + "]")
  for (const violation of violations) {
    console.log("- " + violation)
  }
}

const rejectedUsages = validations.filter(
  (item) => item.violations.length > 0 || !item.resolved,
)

console.log()
console.log("========== Runtime Decision ==========")
console.log("model usages     : " + validations.length)
console.log("rejected usages  : " + rejectedUsages.length)
console.log(
  "result           : " +
    (rejectedUsages.length === 0 ? "ACCEPTED" : "REJECTED"),
)

const localCases: ComponentUsage[] = [
  {
    component: "Dialog",
    purpose: "验证未开放 Group 会被拒绝。",
    props: {
      title: "确认删除",
      open: true,
    },
  },
  {
    component: "Button",
    purpose: "验证 05 仍然保留 03 的 Props Schema 校验。",
    props: {
      label: 123,
      action: "create-task",
      variant: "rainbow",
    },
  },
]

console.log()
console.log("========== Local Invalid Cases ==========")

for (const usage of localCases) {
  const violations = validateUsage(usage)

  console.log("\n[" + usage.component + "]")
  for (const violation of violations) {
    console.log("- " + violation)
  }

  console.log(
    "result: " + (violations.length === 0 ? "ACCEPTED" : "REJECTED"),
  )

  if (violations.length === 0) {
    throw new Error("local invalid case unexpectedly passed: " + usage.component)
  }
}

console.log()
console.log("========== What Can We Validate? ==========")
console.table([
  { capability: "Component Name", result: "YES" },
  { capability: "Component Metadata", result: "YES" },
  { capability: "Props Schema", result: "YES" },
  { capability: "Reference Integrity", result: "YES" },
  { capability: "Resolve To Implementation", result: "YES" },
  { capability: "Group Scope", result: "YES" },
  { capability: "Reusable Library Abstraction", result: "NEXT_STEP" },
])

console.log("========== Observation ==========")
console.log(
  "05 不是用 Group 替换前面的规则，而是在 name + metadata + props + reference 上继续增加能力分组。",
)
console.log(
  "System 先把完整 Library 缩成当前 Scope；Model 只在 Scope 中选择，Runtime 仍然校验 props、group 和 reference。",
)
console.log(
  "下一节 06 · Minimal Component Library 不再增加新字段，而是把 01～05 的规则收敛成一个真正可复用的 ComponentLibrary。",
)
