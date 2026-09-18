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

const signatures = scope.list().map(toSignature)

const prompt = [
  userRequest,
  "",
  "只能使用下面 Component Signatures：",
  "",
  ...signatures.map((signature) => "- " + signature),
  "",
  outputContract,
  "",
  "- component 必须来自 signatures",
  "- props 必须符合 signature",
  "- 不要生成代码",
].join("\n")

console.log("========== OpenUI Study 03.02 · Component Signature ==========")
console.log("========== Cumulative Capability ==========")
console.log("01 manual prompt : YES")
console.log("02 signature     : NEW")
console.log()

console.log("========== Component Signatures ==========")
console.log(signatures.join("\n"))
console.log()

const button = scope.get("Button")
if (!button) throw new Error("Button is required in current scope")

const buttonSignature = toSignature(button)

console.log("========== Local Signature Check ==========")
console.log(buttonSignature)
console.log(
  "contains enum : " +
    (buttonSignature.includes('"primary" | "secondary" | "danger"') ? "YES" : "NO"),
)
console.log(
  "optional mark : " + (buttonSignature.includes("variant?:") ? "YES" : "NO"),
)

if (!buttonSignature.includes("label: string")) {
  throw new Error("Button signature lost required label")
}

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
  "02 把零散 props 规则压成稳定的 Component Signature，Model 更容易看出 required、optional 和 enum。",
)
console.log(
  "但 Signature 主要回答“怎么调用”，还没有告诉 Model“为什么、什么时候该选这个组件”。",
)
console.log(
  "下一节 03 · Description Injection 会把 ComponentLibrary 中的 description 一起注入。",
)
