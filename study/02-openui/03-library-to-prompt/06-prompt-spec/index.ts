import type {
  ComponentDefinition,
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

type PromptSpec = {
  intro: string
  rules: string[]
  examples: PromptExample[]
  outputContract: string
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

function renderCatalog(): string {
  const groupById = new Map(
    library.listGroups().map((group) => [group.id, group]),
  )

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

function validateSpec(spec: PromptSpec): string[] {
  const issues: string[] = []

  if (!spec.intro.trim()) {
    issues.push("intro must not be empty")
  }

  if (spec.rules.length === 0) {
    issues.push("rules must not be empty")
  }

  const ids = spec.examples.map((example) => example.id)
  const uniqueIds = new Set(ids)

  if (uniqueIds.size !== ids.length) {
    issues.push("example ids must be unique")
  }

  for (const example of spec.examples) {
    const violations = validatePlan(example.answer)
      .flatMap((item) => item.violations)

    if (violations.length > 0) {
      issues.push(
        "example " + example.id + " violates ComponentScope",
      )
    }
  }

  if (!spec.outputContract.trim()) {
    issues.push("outputContract must not be empty")
  }

  return issues
}

function renderSpec(spec: PromptSpec, request: string): string {
  const exampleText = spec.examples
    .map((example) =>
      [
        "### Example: " + example.id,
        "User: " + example.request,
        "Assistant:",
        JSON.stringify(example.answer, null, 2),
      ].join("\n"),
    )
    .join("\n\n")

  return [
    spec.intro,
    "",
    "# User Request",
    request,
    "",
    "# Components",
    renderCatalog(),
    "",
    "# Rules",
    ...spec.rules.map((rule) => "- " + rule),
    "",
    "# Examples",
    exampleText,
    "",
    "# Output Contract",
    spec.outputContract,
  ].join("\n")
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
          props: { columns: ["任务名称", "状态"], striped: true },
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
]

const spec: PromptSpec = {
  intro: "你是受 Component Library 约束的 UI Planner。",
  rules: [
    "只能使用当前 Component Scope 中列出的组件。",
    "根据 group 和 description 选择组件。",
    "props 必须符合 Component Signature。",
    "不要输出 group/reference，不要生成代码。",
  ],
  examples,
  outputContract,
}

console.log("========== OpenUI Study 03.06 · Prompt Spec ==========")
console.log("========== Cumulative Capability ==========")
console.log("01 manual prompt : YES")
console.log("02 signature     : YES")
console.log("03 description   : YES")
console.log("04 group/rules   : YES")
console.log("05 examples      : YES")
console.log("06 prompt spec   : NEW")
console.log()

const issues = validateSpec(spec)

console.log("========== Prompt Spec Validation ==========")
console.log("issues : " + issues.length)

for (const issue of issues) {
  console.log("- " + issue)
}

if (issues.length > 0) {
  throw new Error("PromptSpec is invalid")
}

console.log("result : VALID")
console.log()

const firstExample = examples[0]
if (!firstExample) throw new Error("at least one example is required")

const brokenSpec: PromptSpec = {
  intro: "",
  rules: [],
  examples: [firstExample, firstExample],
  outputContract: "",
}

const brokenIssues = validateSpec(brokenSpec)

console.log("========== Local Broken PromptSpec ==========")
for (const issue of brokenIssues) {
  console.log("- " + issue)
}
console.log("issues : " + brokenIssues.length)
console.log("result : " + (brokenIssues.length === 0 ? "VALID" : "INVALID"))

if (brokenIssues.length < 3) {
  throw new Error("broken PromptSpec did not expose expected issues")
}

const prompt = renderSpec(spec, userRequest)

console.log()
console.log("========== Rendered Prompt ==========")
console.log(prompt)
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
  "06 把 Prompt 从一大段字符串收敛成 PromptSpec：intro、rules、examples、outputContract 都成为结构化配置。",
)
console.log(
  "但 renderSpec 仍然写死在当前实验里；下一节会把 ComponentScope + PromptSpec → Prompt 抽成真正可复用的 Generator。",
)
