import type {
  ComponentDefinition,
  ComponentUsage,
  PropRule,
} from "../../02-component-library/06-minimal-component-library/component-library.js"
import {
  activeGroups,
  createProvider,
  library,
  outputContract,
  parseUiPlan,
  printPlanValidation,
  scope,
  type UiPlan,
  userRequest,
  validatePlan,
} from "../study-fixture.js"

type PromptExample = {
  id: string
  request: string
  answer: UiPlan
}

function propTypeText(rule: PropRule): string {
  if (rule.enum) {
    return rule.enum.map((value) => JSON.stringify(value)).join(" | ")
  }

  return rule.type
}

function toSignature(definition: ComponentDefinition): string {
  const props = Object.entries(definition.props)
    .map(([name, rule]) => {
      const optional = rule.required ? "" : "?"
      return name + optional + ": " + propTypeText(rule)
    })
    .join(", ")

  return definition.name + "(" + props + ")"
}

const groupById = new Map(
  library.listGroups().map((group) => [group.id, group]),
)

function renderCatalog(): string {
  return activeGroups
    .map((groupId) => {
      const group = groupById.get(groupId)
      if (!group) throw new Error("unknown group: " + groupId)

      const components = scope
        .list()
        .filter((definition) => definition.group === groupId)

      return [
        "## " + group.id,
        group.description,
        ...components.map((definition) =>
          "- " + toSignature(definition) + " — " + definition.description,
        ),
      ].join("\n")
    })
    .join("\n\n")
}

const examples: PromptExample[] = [
  {
    id: "task-list",
    request: "做一个任务列表页，带新建按钮",
    answer: {
      page: "任务列表",
      components: [
        {
          component: "Page",
          purpose: "承载任务列表页面。",
          props: { title: "任务列表" },
        },
        {
          component: "DataTable",
          purpose: "展示任务名称和状态。",
          props: {
            columns: ["任务名称", "状态"],
            striped: true,
          },
        },
        {
          component: "Button",
          purpose: "新建任务。",
          props: {
            label: "新建任务",
            action: "create-task",
            variant: "primary",
          },
        },
      ],
    },
  },
  {
    id: "overview",
    request: "做一个同步运行概览",
    answer: {
      page: "同步概览",
      components: [
        {
          component: "Page",
          purpose: "承载同步概览页面。",
          props: { title: "同步概览" },
        },
        {
          component: "StatCard",
          purpose: "展示运行任务数量。",
          props: {
            label: "运行中",
            value: "8",
            tone: "success",
          },
        },
        {
          component: "StatusBadge",
          purpose: "展示同步状态。",
          props: {
            status: "running",
            text: "运行中",
          },
        },
      ],
    },
  },
]

console.log("========== OpenUI Study 03.05 · Examples ==========")
console.log("========== Cumulative Capability ==========")
console.log("01 manual prompt : YES")
console.log("02 signature     : YES")
console.log("03 description   : YES")
console.log("04 group/rules   : YES")
console.log("05 examples      : NEW")
console.log()

console.log("========== Example Validation ==========")

for (const example of examples) {
  const invalid = validatePlan(example.answer)
    .filter((item) => item.violations.length > 0)

  console.log(
    example.id +
      " : " +
      (invalid.length === 0 ? "VALID" : "INVALID"),
  )

  if (invalid.length > 0) {
    throw new Error("prompt example is invalid: " + example.id)
  }
}

const badExample: UiPlan = {
  page: "错误示例",
  components: [
    {
      component: "Dialog",
      purpose: "当前 scope 不允许 overlay。",
      props: {
        title: "确认",
        open: true,
      },
    },
  ],
}

const badExampleIssues = validatePlan(badExample)
  .flatMap((item) => item.violations)

console.log()
console.log("========== Local Invalid Example Case ==========")
console.log("violations : " + badExampleIssues.length)
for (const violation of badExampleIssues) {
  console.log("- " + violation)
}
console.log("result     : " + (badExampleIssues.length === 0 ? "VALID" : "REJECTED"))

if (badExampleIssues.length === 0) {
  throw new Error("invalid example unexpectedly passed")
}

const rules = [
  "只能使用当前 Component Scope 中列出的组件。",
  "根据 group 和 description 选择组件。",
  "props 必须符合 Component Signature。",
  "Examples 只演示组合方式，不会替代 Runtime Validation。",
  "不要输出 group/reference，不要生成代码。",
]

const exampleText = examples
  .map((example) =>
    [
      "### Example: " + example.id,
      "User: " + example.request,
      "Assistant:",
      JSON.stringify(example.answer, null, 2),
    ].join("\n"),
  )
  .join("\n\n")

const prompt = [
  userRequest,
  "",
  "# Components",
  renderCatalog(),
  "",
  "# Rules",
  ...rules.map((rule) => "- " + rule),
  "",
  "# Examples",
  exampleText,
  "",
  outputContract,
].join("\n")

console.log()
console.log("========== Prompt Examples ==========")
console.log(exampleText)
console.log()

const provider = createProvider()
const response = await provider.chat({
  messages: [{ role: "user", content: prompt }],
})

console.log("========== Model Output ==========")
console.log(response.content)
console.log()

const plan = parseUiPlan(response.content)

console.log("========== Runtime Validation ==========")
const validations = printPlanValidation(plan)
const invalid = validations.filter((item) => item.violations.length > 0)

console.log()
console.log("========== Runtime Decision ==========")
console.log("invalid usages : " + invalid.length)
console.log("result         : " + (invalid.length === 0 ? "ACCEPTED" : "REJECTED"))

console.log()
console.log("========== Observation ==========")
console.log(
  "05 在 Signature + Description + Group Rules 上增加少量正确 Examples，帮助 Model 学会组件组合和输出形状。",
)
console.log(
  "Examples 本身也必须经过 ComponentScope 校验；错误示例不能成为 Harness 的隐性规则来源。",
)
console.log(
  "下一节 06 · Prompt Spec 会把散落的 intro、rules、examples、output contract 收敛成结构化配置。",
)
