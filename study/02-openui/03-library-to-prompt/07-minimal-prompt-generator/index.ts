import {
  ComponentPromptGenerator,
  type ComponentPromptSpec,
} from "./prompt-generator.js"
import {
  createProvider,
  library,
  outputContract,
  parseUiPlan,
  printPlanValidation,
  scope,
  userRequest,
  validatePlan,
} from "../study-fixture.js"

const examplePlan = {
  page: "任务列表",
  components: [
    {
      component: "Page",
      purpose: "承载任务列表页面。",
      props: { title: "任务列表" },
    },
    {
      component: "DataTable",
      purpose: "展示任务。",
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
}

const exampleViolations = validatePlan(examplePlan)
  .flatMap((item) => item.violations)

if (exampleViolations.length > 0) {
  throw new Error("example plan is invalid")
}

const spec: ComponentPromptSpec = {
  intro: "你是受 Component Library 约束的 UI Planner。",
  rules: [
    "只能使用当前 Component Scope 中列出的组件。",
    "根据 group 和 description 选择组件。",
    "props 必须符合 Component Signature。",
    "不要输出 group/reference，不要生成代码。",
  ],
  examples: [
    {
      id: "task-list",
      request: "做一个任务列表页，带新建按钮",
      answer: examplePlan,
    },
  ],
  outputContract,
}

const generator = new ComponentPromptGenerator(library)
const prompt = generator.generate({
  request: userRequest,
  scope,
  spec,
})

console.log("========== OpenUI Study 03.07 · Minimal Prompt Generator ==========")
console.log("========== Cumulative Capability ==========")
console.log("01 manual prompt : YES")
console.log("02 signature     : YES")
console.log("03 description   : YES")
console.log("04 group/rules   : YES")
console.log("05 examples      : YES")
console.log("06 prompt spec   : YES")
console.log("07 generator     : NEW")
console.log()

console.log("========== Generated Prompt ==========")
console.log(prompt)
console.log()

const formScope = library.scope(["form"])
const formPrompt = generator.generate({
  request: "做一个筛选表单",
  scope: formScope,
  spec: {
    ...spec,
    examples: [],
  },
})

console.log("========== Local Auto-Sync Case ==========")
console.log("form prompt has Input  : " + (formPrompt.includes("Input(") ? "YES" : "NO"))
console.log("form prompt has Select : " + (formPrompt.includes("Select(") ? "YES" : "NO"))
console.log("form prompt has Button : " + (formPrompt.includes("Button(") ? "YES" : "NO"))

if (
  !formPrompt.includes("Input(") ||
  !formPrompt.includes("Select(") ||
  formPrompt.includes("Button(")
) {
  throw new Error("PromptGenerator did not follow ComponentScope automatically")
}

console.log(
  "result: changing ComponentScope automatically changes prompt components without editing prompt text.",
)
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
console.log("========== What Was Consolidated? ==========")
console.table([
  { source: "ComponentLibrary / ComponentScope", output: "components + groups + schema + descriptions" },
  { source: "PromptSpec", output: "intro + rules + examples + output contract" },
  { source: "ComponentPromptGenerator", output: "final prompt" },
])

console.log("========== Observation ==========")
console.log(
  "07 最终消除了手工维护组件 Prompt：Generator 每次直接读取 ComponentScope 和 PromptSpec。",
)
console.log(
  "组件增删、props 变化、group scope 变化都会自然反映到 Prompt，不需要再复制一份组件规则。",
)
console.log(
  "Library → Prompt 到这里可以封板；下一章进入 UI Language / Parser，解决 Model 为什么不能继续自由输出 JSX。",
)
