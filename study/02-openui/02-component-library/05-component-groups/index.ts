import { DeepSeekProvider } from "../../../../mvp/01-llm/07-unified-llm-interface/deepseek-provider.js"

type JsonObject = Record<string, unknown>

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
  props: Record<string, string>
  reference: string
  group: ComponentGroupId
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

const library: ComponentDefinition[] = [
  {
    name: "Page",
    description: "页面根容器。",
    props: { title: "string required", subtitle: "string" },
    reference: "ui.page",
    group: "layout",
  },
  {
    name: "Card",
    description: "内容分组容器。",
    props: { title: "string" },
    reference: "ui.card",
    group: "layout",
  },
  {
    name: "StatCard",
    description: "展示单个统计指标。",
    props: {
      label: "string required",
      value: "string required",
      tone: "default|success|warning|danger",
    },
    reference: "ui.stat-card",
    group: "data-display",
  },
  {
    name: "DataTable",
    description: "展示多行多列数据。",
    props: { columns: "string[] required", striped: "boolean" },
    reference: "ui.data-table",
    group: "data-display",
  },
  {
    name: "StatusBadge",
    description: "展示简短状态。",
    props: { status: "running|success|failed|paused", text: "string" },
    reference: "ui.status-badge",
    group: "data-display",
  },
  {
    name: "Button",
    description: "触发用户操作。",
    props: {
      label: "string required",
      action: "string required",
      variant: "primary|secondary|danger",
    },
    reference: "ui.button",
    group: "action",
  },
  {
    name: "Input",
    description: "输入自由文本。",
    props: { name: "string required", placeholder: "string" },
    reference: "ui.input",
    group: "form",
  },
  {
    name: "Select",
    description: "从有限选项中选择。",
    props: { name: "string required", options: "string[] required" },
    reference: "ui.select",
    group: "form",
  },
  {
    name: "Dialog",
    description: "承载模态交互。",
    props: { title: "string required", open: "boolean required" },
    reference: "ui.dialog",
    group: "overlay",
  },
  {
    name: "Tabs",
    description: "切换多个并列视图。",
    props: { items: "string[] required", activeKey: "string" },
    reference: "ui.tabs",
    group: "navigation",
  },
]

const definitionByName = new Map(library.map((item) => [item.name, item]))
const groupById = new Map(groups.map((group) => [group.id, group]))

const userRequest = "帮我做一个数据同步任务列表页面"

// 这一节先不研究“自动选择 Group”。
// 当前场景由 System 明确决定只开放这些能力。
const activeGroups: ComponentGroupId[] = ["layout", "data-display", "action"]
const activeGroupSet = new Set<ComponentGroupId>(activeGroups)

function selectLibraryByGroups(
  definitions: ComponentDefinition[],
  selectedGroups: ComponentGroupId[],
) {
  const selected = new Set<ComponentGroupId>(selectedGroups)
  return definitions.filter((definition) => selected.has(definition.group))
}

function validateGroupDefinitions(definitions: ComponentDefinition[]) {
  return definitions
    .filter((definition) => !groupById.has(definition.group))
    .map((definition) => ({
      component: definition.name,
      group: definition.group,
    }))
}

function validateUsageScope(usage: ComponentUsage): string[] {
  const definition = definitionByName.get(usage.component)

  if (!definition) {
    return ["unknown component: " + usage.component]
  }

  if (!activeGroupSet.has(definition.group)) {
    return [
      "component " +
        usage.component +
        " belongs to inactive group: " +
        definition.group,
    ]
  }

  return []
}

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

const groupDefinitionIssues = validateGroupDefinitions(library)

if (groupDefinitionIssues.length > 0) {
  console.table(groupDefinitionIssues)
  throw new Error("component library contains unknown groups")
}

const scopedLibrary = selectLibraryByGroups(library, activeGroups)

const modelLibrary = scopedLibrary.map(
  ({ reference: _reference, group: _group, ...visible }) => visible,
)

const prompt = [
  userRequest,
  "",
  "你只能使用下面当前场景开放的 Component Library。",
  "没有出现在列表里的组件不能使用。",
  "",
  JSON.stringify(modelLibrary, null, 2),
  "",
  '只返回合法 JSON：{"page":"","components":[{"component":"","purpose":"","props":{}}]}',
  "",
  "- component 必须来自当前开放的 Component Library",
  "- props 只使用已声明字段",
  "- 不要输出 group",
  "- 不要输出 reference",
  "- 不要生成代码",
].join("\n")

const provider = new DeepSeekProvider({ apiKey, baseUrl, model })

console.log("========== OpenUI Study 02.05 · Component Groups ==========")
console.log("provider : " + provider.name)
console.log("model    : " + provider.model)
console.log()

console.log("========== Component Groups ==========")
console.table(groups)

console.log("========== Full Component Library ==========")
console.table(
  library.map((component) => ({
    component: component.name,
    group: component.group,
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
  })),
)

console.log("full component count   : " + library.length)
console.log("scoped component count : " + scopedLibrary.length)
console.log(
  "hidden component count : " + (library.length - scopedLibrary.length),
)
console.log()

const response = await provider.chat({
  messages: [{ role: "user", content: prompt }],
})

console.log("========== Model Output ==========")
console.log(response.content)
console.log()

const plan = parsePlan(response.content)

const validations = plan.components.map((usage) => ({
  usage,
  violations: validateUsageScope(usage),
}))

console.log("========== Group Scope Validation ==========")
console.table(
  validations.map(({ usage, violations }) => ({
    component: usage.component,
    group: definitionByName.get(usage.component)?.group ?? "UNKNOWN",
    violations: violations.length,
    result: violations.length === 0 ? "ALLOWED" : "REJECTED",
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
console.log("model usages       : " + validations.length)
console.log("out-of-scope usages: " + invalidUsages.length)
console.log(
  "result             : " +
    (invalidUsages.length === 0 ? "ACCEPTED" : "REJECTED"),
)

const localOutOfScopeCase: ComponentUsage = {
  component: "Dialog",
  purpose: "故意使用当前场景没有开放的 overlay 组件。",
  props: {
    title: "确认删除",
    open: true,
  },
}

const localViolations = validateUsageScope(localOutOfScopeCase)

console.log()
console.log("========== Local Out-of-Scope Case ==========")
console.log(JSON.stringify(localOutOfScopeCase, null, 2))
console.log()
console.log("active groups : " + activeGroups.join(", "))
console.log("violations    : " + localViolations.length)

for (const violation of localViolations) {
  console.log("- " + violation)
}

console.log(
  "result        : " +
    (localViolations.length === 0 ? "ALLOWED" : "REJECTED"),
)

if (localViolations.length === 0) {
  throw new Error("local out-of-scope case unexpectedly passed validation")
}

console.log()
console.log("========== What Did Groups Change? ==========")
console.table([
  { question: "完整 Library 还保留吗？", result: "YES" },
  { question: "组件是否有 Group？", result: "YES" },
  { question: "当前场景是否只暴露部分 Groups？", result: "YES" },
  { question: "Model 是否还能看到全部组件？", result: "NO" },
  { question: "Runtime 能否拒绝未开放 Group 的组件？", result: "YES" },
  { question: "这一节是否自动判断该选哪些 Groups？", result: "NO" },
])

console.log("========== Observation ==========")
console.log(
  "Component Groups 没有删除完整 Library，而是在完整能力集合上增加了可选择的组织边界。",
)
console.log(
  "当前场景只开放 layout + data-display + action，所以 Model 不再看到 form / navigation / overlay。",
)
console.log(
  "Group selection 当前仍由 System 明确指定；这一节只证明：组件选择空间可以被确定性缩小。",
)
console.log(
  "下一节 06 · Minimal Component Library 要把 name / description / props / reference / group 收敛成一个完整最小抽象。",
)
