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

const groupById = new Map(
  library.listGroups().map((group) => [group.id, group]),
)

function renderGroup(groupId: string): string {
  const group = groupById.get(groupId)

  if (!group) {
    throw new Error("unknown group: " + groupId)
  }

  const components = scope
    .list()
    .filter((definition) => definition.group === groupId)

  return [
    "## " + group.id,
    group.description,
    "",
    ...components.map((definition) =>
      [
        "- " + toSignature(definition),
        "  " + definition.description,
      ].join("\n"),
    ),
  ].join("\n")
}

const groupSections = activeGroups.map(renderGroup)

const rules = [
  "只能使用当前 Component Scope 中列出的组件。",
  "优先根据 group 缩小选择范围，再根据 description 选择具体组件。",
  "props 必须符合 Component Signature。",
  "不要输出 group。",
  "不要输出 reference。",
  "不要生成代码。",
]

const prompt = [
  userRequest,
  "",
  "# Available Component Groups",
  "",
  groupSections.join("\n\n"),
  "",
  "# Rules",
  ...rules.map((rule) => "- " + rule),
  "",
  outputContract,
].join("\n")

console.log("========== OpenUI Study 03.04 · Group / Rules ==========")
console.log("========== Cumulative Capability ==========")
console.log("01 manual prompt : YES")
console.log("02 signature     : YES")
console.log("03 description   : YES")
console.log("04 group/rules   : NEW")
console.log()

console.log("========== Active Groups ==========")
console.log(activeGroups.join(", "))
console.log()

console.log("========== Grouped Prompt Catalog ==========")
console.log(groupSections.join("\n\n"))
console.log()

const scopedNames = new Set(scope.list().map((definition) => definition.name))
const hiddenComponents = library
  .list()
  .filter((definition) => !scopedNames.has(definition.name))
  .map((definition) => definition.name)

console.log("========== Local Scope Check ==========")
console.log("visible components: " + [...scopedNames].join(", "))
console.log("hidden components : " + hiddenComponents.join(", "))
console.log("Dialog visible    : " + (scopedNames.has("Dialog") ? "YES" : "NO"))

if (scopedNames.has("Dialog")) {
  throw new Error("Dialog should be hidden from current prompt scope")
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
  "04 没有改变 ComponentLibrary，而是把已有 group/scope 变成 Model 能理解的 Prompt 结构。",
)
console.log(
  "Model 不再面对平铺组件列表，而是先看到能力组，再看到组内组件和明确规则。",
)
console.log(
  "下一节 05 · Examples 研究：只有规则仍然不够时，如何给 Model 少量正确组合示例。",
)
