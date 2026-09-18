import {
  createProvider,
  outputContract,
  parseUiPlan,
  printPlanValidation,
  scope,
  userRequest,
} from "../study-fixture.js"

const manualComponentPrompt = [
  "你只能使用下面这些组件：",
  "",
  "- Page: 页面根容器。props: title:string required, subtitle:string",
  "- Card: 内容分组容器。props: title:string",
  "- StatCard: 指标卡片。props: label:string required, value:string required, tone:default|success|warning|danger",
  "- DataTable: 数据表格。props: columns:string[] required, striped:boolean",
  "- StatusBadge: 状态徽标。props: status:running|success|failed|paused, text:string",
  "- Button: 操作按钮。props: label:string required, action:string required, variant:primary|secondary|danger",
].join("\n")

const prompt = [
  userRequest,
  "",
  manualComponentPrompt,
  "",
  outputContract,
  "",
  "- component 必须来自上面的手工组件列表",
  "- props 必须符合手工写出的约束",
  "- 不要生成代码",
].join("\n")

console.log("========== OpenUI Study 03.01 · Manual Component Prompt ==========")
console.log("========== Cumulative Capability ==========")
console.log("01 manual prompt : NEW")
console.log()

console.log("========== Manual Prompt ==========")
console.log(manualComponentPrompt)
console.log()

const manualNames = ["Page", "Card", "StatCard", "DataTable", "StatusBadge", "Button"]
const scopeNames = scope.list().map((definition) => definition.name)

console.log("========== Manual Sync Check ==========")
console.log("scope components  : " + scopeNames.length)
console.log("manual components : " + manualNames.length)
console.log(
  "missing in manual : " +
    scopeNames.filter((name) => !manualNames.includes(name)).join(", "),
)

const staleManualNames = manualNames.filter((name) => name !== "StatusBadge")
const staleMissing = scopeNames.filter((name) => !staleManualNames.includes(name))

console.log()
console.log("========== Local Stale Prompt Case ==========")
console.log("pretend StatusBadge was forgotten while editing the prompt")
console.log("missing components: " + staleMissing.join(", "))
console.log("result            : DRIFT_DETECTED")

if (!staleMissing.includes("StatusBadge")) {
  throw new Error("stale manual prompt case did not expose maintenance drift")
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
  "01 证明最直接的方法就是把 Component Library 手工抄进 Prompt，Model 确实能看到组件能力。",
)
console.log(
  "但组件规则现在维护了两份：一份在 ComponentLibrary，一份在手写 Prompt；两边很容易发生漂移。",
)
console.log(
  "下一节 02 · Component Signature 先解决：如何把 props 用稳定格式表达出来。",
)
