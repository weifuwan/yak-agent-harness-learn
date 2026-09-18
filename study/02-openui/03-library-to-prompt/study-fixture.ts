import { DeepSeekProvider } from "../../../mvp/01-llm/07-unified-llm-interface/deepseek-provider.js"
import {
  ComponentLibrary,
  type ComponentDefinition,
  type ComponentGroup,
  type ComponentImplementation,
  type ComponentScope,
  type ComponentUsage,
  type JsonObject,
} from "../02-component-library/06-minimal-component-library/component-library.js"

export type UiPlan = {
  page: string
  components: ComponentUsage[]
}

export const userRequest = "帮我做一个数据同步任务列表页面"

export const groups: ComponentGroup[] = [
  { id: "layout", description: "页面与内容结构容器。" },
  { id: "data-display", description: "表格、指标、状态等数据展示组件。" },
  { id: "action", description: "触发明确用户操作的组件。" },
  { id: "form", description: "文本输入和选项选择组件。" },
  { id: "navigation", description: "同一区域视图切换等导航组件。" },
  { id: "overlay", description: "模态层、浮层等临时交互容器。" },
]

export const implementations: ComponentImplementation[] = [
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

export const definitions: ComponentDefinition[] = [
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
      tone: { type: "string", enum: ["default", "success", "warning", "danger"] },
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
      variant: { type: "string", enum: ["primary", "secondary", "danger"] },
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

export const library = new ComponentLibrary({
  groups,
  definitions,
  implementations,
})

library.assertValid()

export const activeGroups = ["layout", "data-display", "action"]
export const scope = library.scope(activeGroups)

export const outputContract = [
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
].join("\n")

export function createProvider() {
  const apiKey = process.env.MODEL_API_KEY?.trim()
  const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").trim()
  const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"

  if (!apiKey) {
    throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
  }

  return new DeepSeekProvider({ apiKey, baseUrl, model })
}

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

export function parseUiPlan(content: string): UiPlan {
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

export function validatePlan(plan: UiPlan, componentScope: ComponentScope = scope) {
  return plan.components.map((usage) => ({
    usage,
    violations: componentScope.validateUsage(usage),
  }))
}

export function printPlanValidation(plan: UiPlan, componentScope: ComponentScope = scope) {
  const validations = validatePlan(plan, componentScope)

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

  return validations
}
