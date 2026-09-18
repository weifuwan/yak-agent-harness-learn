import { DeepSeekProvider } from "../../../../mvp/01-llm/07-unified-llm-interface/deepseek-provider.js"

type JsonObject = Record<string, unknown>

type ComponentDefinition = {
  name: string
  description: string
  props: Record<string, string>
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
  implementations.map((item) => [item.id, item]),
)

const library: ComponentDefinition[] = [
  { name: "Page", description: "页面根容器。", props: { title: "string required", subtitle: "string" }, reference: "ui.page" },
  { name: "Card", description: "内容分组容器。", props: { title: "string" }, reference: "ui.card" },
  { name: "StatCard", description: "展示单个统计指标。", props: { label: "string required", value: "string required", tone: "default|success|warning|danger" }, reference: "ui.stat-card" },
  { name: "DataTable", description: "展示多行多列数据。", props: { columns: "string[] required", striped: "boolean" }, reference: "ui.data-table" },
  { name: "StatusBadge", description: "展示简短状态。", props: { status: "running|success|failed|paused", text: "string" }, reference: "ui.status-badge" },
  { name: "Button", description: "触发用户操作。", props: { label: "string required", action: "string required", variant: "primary|secondary|danger" }, reference: "ui.button" },
  { name: "Input", description: "输入自由文本。", props: { name: "string required", placeholder: "string" }, reference: "ui.input" },
  { name: "Select", description: "从有限选项中选择。", props: { name: "string required", options: "string[] required" }, reference: "ui.select" },
  { name: "Dialog", description: "承载模态交互。", props: { title: "string required", open: "boolean required" }, reference: "ui.dialog" },
  { name: "Tabs", description: "切换多个并列视图。", props: { items: "string[] required", activeKey: "string" }, reference: "ui.tabs" },
]

const definitionByName = new Map(library.map((item) => [item.name, item]))
const userRequest = "帮我做一个数据同步任务列表页面"

const modelLibrary = library.map(({ reference: _reference, ...visible }) => visible)

const prompt = [
  userRequest,
  "你只能使用下面的 Component Library。reference 是 Runtime 内部信息，所以没有暴露给你。",
  JSON.stringify(modelLibrary, null, 2),
  '只返回合法 JSON：{"page":"","components":[{"component":"","purpose":"","props":{}}]}',
  "component 必须来自 Library；props 只使用已声明字段；不要生成 reference；不要生成代码。",
].join("\n\n")

function extractJsonObject(content: string): JsonObject {
  const start = content.indexOf("{")
  const end = content.lastIndexOf("}")
  if (start < 0 || end <= start) throw new Error("response does not contain JSON")

  const value: unknown = JSON.parse(content.slice(start, end + 1))
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("top-level JSON must be object")
  }
  return value as JsonObject
}

function parsePlan(content: string): UiPlan {
  const data = extractJsonObject(content)
  if (typeof data.page !== "string") throw new Error("page must be string")
  if (!Array.isArray(data.components)) throw new Error("components must be array")

  const components = data.components.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("components[" + index + "] must be object")
    }
    const object = item as JsonObject
    if (typeof object.component !== "string") throw new Error("component must be string")
    if (typeof object.purpose !== "string") throw new Error("purpose must be string")
    if (!object.props || typeof object.props !== "object" || Array.isArray(object.props)) {
      throw new Error("props must be object")
    }
    return {
      component: object.component,
      purpose: object.purpose,
      props: object.props as JsonObject,
    }
  })

  return { page: data.page, components }
}

function resolveReference(componentName: string) {
  const definition = definitionByName.get(componentName)
  if (!definition) throw new Error("unknown component: " + componentName)

  const implementation = implementationById.get(definition.reference)
  if (!implementation) {
    throw new Error("unresolved reference: " + definition.reference)
  }

  return { definition, implementation }
}

const provider = new DeepSeekProvider({ apiKey, baseUrl, model })

console.log("========== OpenUI Study 02.04 · Component Reference ==========")
console.log("provider : " + provider.name)
console.log("model    : " + provider.model)
console.log()

console.log("========== Implementation Registry ==========")
console.table(implementations)

console.log("========== Library References ==========")
console.table(library.map((item) => ({ component: item.name, reference: item.reference })))

const response = await provider.chat({
  messages: [{ role: "user", content: prompt }],
})

console.log("========== Model Output ==========")
console.log(response.content)
console.log()

const plan = parsePlan(response.content)
const uniqueComponents = [...new Set(plan.components.map((item) => item.component))]

const resolved = uniqueComponents.map((component) => {
  const { definition, implementation } = resolveReference(component)
  return {
    component,
    reference: definition.reference,
    source: implementation.source,
    exportName: implementation.exportName,
  }
})

console.log("========== Reference Resolution ==========")
console.table(resolved)

console.log("========== Runtime Decision ==========")
console.log("used component types : " + uniqueComponents.length)
console.log("resolved references  : " + resolved.length)
console.log("unresolved references: 0")
console.log("result               : RESOLVED")

const brokenDefinition: ComponentDefinition = {
  name: "BrokenButton",
  description: "故意构造的错误组件定义。",
  props: {},
  reference: "ui.missing-button",
}
const brokenImplementation = implementationById.get(brokenDefinition.reference)

console.log()
console.log("========== Local Broken Reference Case ==========")
console.log("component : " + brokenDefinition.name)
console.log("reference : " + brokenDefinition.reference)
console.log("resolved  : " + (brokenImplementation ? "YES" : "NO"))
console.log("result    : " + (brokenImplementation ? "RESOLVED" : "UNRESOLVED"))

if (brokenImplementation) {
  throw new Error("broken reference case unexpectedly resolved")
}

console.log()
console.log("========== What Can We Validate? ==========")
console.table([
  { question: "组件名是否允许？", result: "YES" },
  { question: "Props 是否符合 Schema？", result: "PREVIOUS_STEP" },
  { question: "Definition 是否有 reference？", result: "YES" },
  { question: "reference 是否能解析？", result: "YES" },
  { question: "真实实现身份是否确定？", result: "YES" },
  { question: "现在是否真正 Render React？", result: "NO" },
])

console.log("========== Observation ==========")
console.log("Component Reference 把抽象 Definition 与真实实现身份连接起来。")
console.log("Model 只选 Button；Runtime 决定 Button -> ui.button -> src/components/Button.tsx。")
console.log("reference 属于 System-owned Runtime Knowledge，不应该由 Model 每次猜。")
console.log("下一节 05 · Component Groups 研究组件多起来以后如何组织选择空间。")