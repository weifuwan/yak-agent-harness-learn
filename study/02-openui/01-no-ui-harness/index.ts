import { DeepSeekProvider } from "../../../mvp/01-llm/07-unified-llm-interface/deepseek-provider.js"

type FrontendDecision = {
  framework: {
    name: string
    version: string
  }
  uiLibrary: string
  styling: string
  stateManagement: string
  router: string
  font: string
  primaryColor: string
  cardRadius: string
  navigation: string
  pageLayout: string
  pages: string[]
  coreComponents: string[]
  directoryStructure: string[]
  dependencies: string[]
}

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").trim()
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const runCount = Number(process.env.HARNESS_RUNS ?? "3")

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

if (!Number.isInteger(runCount) || runCount < 2 || runCount > 10) {
  throw new Error("HARNESS_RUNS must be an integer between 2 and 10")
}

const prompt = `帮我做一个“数据同步系统”的前端。

你拥有完全决定权，不需要遵守任何既有项目规范、组件库、设计系统、目录规范或技术栈约束。请选择你认为最合理的方案。

为了方便比较多次生成结果，请只返回合法 JSON，不要 Markdown，不要解释，结构必须是：
{
  "framework": { "name": "", "version": "" },
  "uiLibrary": "",
  "styling": "",
  "stateManagement": "",
  "router": "",
  "font": "",
  "primaryColor": "",
  "cardRadius": "",
  "navigation": "",
  "pageLayout": "",
  "pages": [],
  "coreComponents": [],
  "directoryStructure": [],
  "dependencies": []
}`

function extractJson(content: string): unknown {
  const start = content.indexOf("{")
  const end = content.lastIndexOf("}")

  if (start < 0 || end <= start) {
    throw new Error(`Model did not return a JSON object:\n${content}`)
  }

  return JSON.parse(content.slice(start, end + 1))
}

function requireString(
  value: unknown,
  field: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid field: ${field}`)
  }
  return value.trim()
}

function requireStringArray(
  value: unknown,
  field: string,
): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`Invalid field: ${field}`)
  }
  return value.map((item) => item.trim()).filter(Boolean)
}

function parseDecision(content: string): FrontendDecision {
  const raw = extractJson(content)
  if (!raw || typeof raw !== "object") {
    throw new Error("Model response must be a JSON object")
  }

  const data = raw as Record<string, unknown>
  const framework = data.framework
  if (!framework || typeof framework !== "object") {
    throw new Error("Invalid field: framework")
  }
  const frameworkData = framework as Record<string, unknown>

  return {
    framework: {
      name: requireString(frameworkData.name, "framework.name"),
      version: requireString(frameworkData.version, "framework.version"),
    },
    uiLibrary: requireString(data.uiLibrary, "uiLibrary"),
    styling: requireString(data.styling, "styling"),
    stateManagement: requireString(data.stateManagement, "stateManagement"),
    router: requireString(data.router, "router"),
    font: requireString(data.font, "font"),
    primaryColor: requireString(data.primaryColor, "primaryColor"),
    cardRadius: requireString(data.cardRadius, "cardRadius"),
    navigation: requireString(data.navigation, "navigation"),
    pageLayout: requireString(data.pageLayout, "pageLayout"),
    pages: requireStringArray(data.pages, "pages"),
    coreComponents: requireStringArray(data.coreComponents, "coreComponents"),
    directoryStructure: requireStringArray(data.directoryStructure, "directoryStructure"),
    dependencies: requireStringArray(data.dependencies, "dependencies"),
  }
}

function compactList(items: string[]): string {
  return items.join(" | ")
}

const dimensions: Array<{
  name: string
  read: (decision: FrontendDecision) => string
}> = [
  {
    name: "framework",
    read: (d) => `${d.framework.name}@${d.framework.version}`,
  },
  { name: "uiLibrary", read: (d) => d.uiLibrary },
  { name: "styling", read: (d) => d.styling },
  { name: "stateManagement", read: (d) => d.stateManagement },
  { name: "router", read: (d) => d.router },
  { name: "font", read: (d) => d.font },
  { name: "primaryColor", read: (d) => d.primaryColor },
  { name: "cardRadius", read: (d) => d.cardRadius },
  { name: "navigation", read: (d) => d.navigation },
  { name: "pageLayout", read: (d) => d.pageLayout },
  { name: "pages", read: (d) => compactList(d.pages) },
  { name: "coreComponents", read: (d) => compactList(d.coreComponents) },
  { name: "directoryStructure", read: (d) => compactList(d.directoryStructure) },
  { name: "dependencies", read: (d) => compactList(d.dependencies) },
]

const provider = new DeepSeekProvider({ apiKey, baseUrl, model })
const decisions: FrontendDecision[] = []

console.log("========== OpenUI Study 01 · No UI Harness ==========")
console.log(`provider : ${provider.name}`)
console.log(`model    : ${provider.model}`)
console.log(`runs     : ${runCount}`)
console.log("same prompt, no frontend harness\n")

for (let index = 0; index < runCount; index += 1) {
  const response = await provider.chat({
    messages: [{ role: "user", content: prompt }],
  })
  const decision = parseDecision(response.content)
  decisions.push(decision)

  console.log(`---------- Run ${index + 1} ----------`)
  console.log(JSON.stringify(decision, null, 2))
  console.log()
}

console.log("========== Stability Comparison ==========")

const summary = dimensions.map((dimension) => {
  const values = decisions.map(dimension.read)
  const uniqueValues = [...new Set(values)]
  return {
    dimension: dimension.name,
    unique: `${uniqueValues.length}/${decisions.length}`,
    result: uniqueValues.length === 1 ? "STABLE_THIS_RUN" : "VARIES",
  }
})

console.table(summary)

const varyingDimensions = summary.filter((item) => item.result === "VARIES")

console.log("========== Observation ==========")
console.log(`varying dimensions : ${varyingDimensions.length}/${summary.length}`)
console.log(
  "没有 Harness 时，这些前端决策的 owner 是模型，不是产品。即使某个字段这次恰好一致，也不代表它已经成为系统约束。",
)
console.log(
  "下一节 Component Library 会先拿回第一部分确定性：明确告诉模型‘哪些组件可以使用’。",
)
