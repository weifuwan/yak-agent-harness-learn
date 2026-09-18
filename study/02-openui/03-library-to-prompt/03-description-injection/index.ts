import type {
  ComponentDefinition,
  PropRule,
} from "../../02-component-library/06-minimal-component-library/component-library.js"
import {
  createProvider,
  outputContract,
  parseUiPlan,
  printPlanValidation,
  scope,
  userRequest,
} from "../study-fixture.js"

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

function toPromptBlock(definition: ComponentDefinition): string {
  return [
    toSignature(definition),
    "  description: " + definition.description,
  ].join("\n")
}

const componentBlocks = scope.list().map(toPromptBlock)

const prompt = [
  userRequest,
  "",
  "只能使用下面组件。Signature 描述调用方式，description 描述组件语义：",
  "",
  componentBlocks.join("\n\n"),
  "",
  outputContract,
  "",
  "- 根据 description 选择合适组件",
  "- props 必须符合 signature",
  "- 不要生成代码",
].join("\n")

console.log("========== OpenUI Study 03.03 · Description Injection ==========")
console.log("========== Cumulative Capability ==========")
console.log("01 manual prompt : YES")
console.log("02 signature     : YES")
console.log("03 description   : NEW")
console.log()

console.log("========== Prompt Representation ==========")
console.log(componentBlocks.join("\n\n"))
console.log()

const table = scope.get("DataTable")
const button = scope.get("Button")

if (!table || !button) {
  throw new Error("DataTable and Button are required in current scope")
}

console.log("========== Semantic Contrast ==========")
console.table([
  {
    component: table.name,
    signature: toSignature(table),
    description: table.description,
  },
  {
    component: button.name,
    signature: toSignature(button),
    description: button.description,
  },
])

console.log(
  "observation: signatures explain shape; descriptions explain intended meaning.",
)

const provider = createProvider()
const response = await provider.chat({
  messages: [{ role: "user", content: prompt }],
})

console.log()
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
  "03 保留 Signature，再把 description 注入 Prompt：调用契约和使用语义第一次同时出现。",
)
console.log(
  "但组件仍然只是平铺列表；组件继续增长时，Model 仍然面对一个没有层次的长列表。",
)
console.log(
  "下一节 04 · Group / Rules 会把 ComponentScope 的分组边界也表达进 Prompt。",
)
