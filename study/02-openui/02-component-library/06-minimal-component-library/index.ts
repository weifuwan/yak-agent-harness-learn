import { DeepSeekProvider } from "../../../../mvp/01-llm/07-unified-llm-interface/deepseek-provider.js"
import {
  ComponentLibrary,
  type ComponentDefinition,
  type ComponentGroup,
  type ComponentImplementation,
  type ComponentUsage,
  type JsonObject,
} from "./component-library.js"

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

const definitions: ComponentDefinition[] = [
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

const library = new ComponentLibrary({
  groups,
  definitions,
  implementations,
})

const libraryIssues = library.validate()

console.log("========== OpenUI Study 02.06 · Minimal Component Library ==========")
console.log("========== Cumulative Capability ==========")
console.log("01 names       : YES")
console.log("02 metadata    : YES")
console.log("03 props       : YES")
console.log("04 reference   : YES")
console.log("05 groups      : YES")
console.log("06 library     : NEW")
console.log()
console.log("========== Library Validation ==========")
console.log("groups          : " + library.listGroups().length)
console.log("components      : " + library.list().length)
console.log("library issues  : " + libraryIssues.length)
console.log("result          : " + (libraryIssues.length === 0 ? "VALID" : "INVALID"))

if (libraryIssues.length > 0) {
  console.table(libraryIssues)
}

library.assertValid()

const activeGroups = ["layout", "data-display", "action"]
const scope = library.scope(activeGroups)

console.log()
console.log("========== Library Scope ==========")
console.log("active groups    : " + activeGroups.join(", "))
console.log("full components  : " + library.list().length)
console.log("scope components : " + scope.list().length)
console.table(
  scope.list().map((definition) => ({
    component: definition.name,
    group: definition.group,
    reference: definition.reference,
  })),
)

const userRequest = "帮我做一个数据同步任务列表页面"

const modelLibrary = scope.list().map(
  ({ reference: _reference, group: _group, ...visible }) => visible,
)

const prompt = [
  userRequest,
  "",
  "你只能使用下面当前场景开放的 Component Library。",
  JSON.stringify(modelLibrary, null, 2),
  "",
  '只返回合法 JSON：{"page":"","components":[{"component":"","purpose":"","props":{}}]}',
  "",
  "- component 必须来自当前 Library Scope",
  "- props 必须符合组件 schema",
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

  return {
    page: data.page,
    components,
  }
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

const validations = plan.components.map((usage) => ({
  usage,
  violations: scope.validateUsage(usage),
}))

console.log("========== Scope + Props Validation ==========")
console.table(
  validations.map(({ usage, violations }) => ({
    component: usage.component,
    group: library.get(usage.component)?.group ?? "UNKNOWN",
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

const validUsages = validations.filter((item) => item.violations.length === 0)

console.log()
console.log("========== Reference Resolution ==========")
console.table(
  validUsages.map(({ usage }) => {
    const resolved = scope.resolve(usage.component)

    return {
      component: usage.component,
      reference: resolved.definition.reference,
      source: resolved.implementation.source,
      exportName: resolved.implementation.exportName,
    }
  }),
)

const invalidUsages = validations.filter((item) => item.violations.length > 0)

console.log("========== Runtime Decision ==========")
console.log("model usages   : " + validations.length)
console.log("valid usages   : " + validUsages.length)
console.log("invalid usages : " + invalidUsages.length)
console.log(
  "result         : " + (invalidUsages.length === 0 ? "ACCEPTED" : "REJECTED"),
)

const localCases: ComponentUsage[] = [
  {
    component: "Dialog",
    purpose: "验证 Scope 能拒绝未开放的 overlay 组件。",
    props: {
      title: "确认删除",
      open: true,
    },
  },
  {
    component: "Button",
    purpose: "验证 Props Schema 仍然属于 ComponentLibrary 的确定性边界。",
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
  const violations = scope.validateUsage(usage)

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

const brokenLibrary = new ComponentLibrary({
  groups,
  implementations,
  definitions: [
    ...definitions,
    {
      name: "BrokenCard",
      description: "故意构造的错误定义。",
      props: {},
      reference: "ui.missing-card",
      group: "missing-group",
    },
  ],
})

const brokenIssues = brokenLibrary.validate()

console.log()
console.log("========== Local Broken Library ==========")
console.table(brokenIssues)
console.log("issues : " + brokenIssues.length)
console.log("result : " + (brokenIssues.length === 0 ? "VALID" : "INVALID"))

if (brokenIssues.length !== 2) {
  throw new Error("broken library should contain exactly two validation issues")
}

console.log()
console.log("========== What Was Consolidated? ==========")
console.table([
  { capability: "Component Names", owner: "ComponentLibrary.list/get" },
  { capability: "Metadata", owner: "ComponentDefinition" },
  { capability: "Props Schema", owner: "ComponentLibrary.validateUsage" },
  { capability: "Reference", owner: "ComponentLibrary.resolve" },
  { capability: "Groups", owner: "ComponentLibrary.scope" },
  { capability: "Library Integrity", owner: "ComponentLibrary.validate/assertValid" },
])

console.log("========== Observation ==========")
console.log(
  "06 没有新增新的 Component Definition 字段，而是把 01～05 的规则收敛成一个可复用边界。",
)
console.log(
  "Model 仍然只负责在当前 Scope 中选择组件；组件是否合法、Props 是否正确、Reference 指向哪里都由 ComponentLibrary 决定。",
)
console.log(
  "Component Library 到这里可以先封板；下一章 03 · Library → Prompt 研究怎样把这套 Library 自动转换成稳定的模型上下文。",
)
