import { DeepSeekProvider } from "../../../../mvp/01-llm/07-unified-llm-interface/deepseek-provider.js"

type JsonObject = Record<string, unknown>

type RunObservation = {
  rawText: string
  data: JsonObject | null
  parseError?: string
  schemaDrift: string[]
}

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").trim()
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const runCount = 3

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

const prompt = `帮我做一个“数据同步系统”的前端。

你拥有完全决定权，不需要遵守任何既有项目规范、组件库、设计系统、目录规范或技术栈约束。请选择你认为最合理的方案。

为了方便比较多次生成结果，请只返回合法 JSON，不要 Markdown，不要解释，结构尽量保持为：
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

const scalarFields = [
  "uiLibrary",
  "styling",
  "stateManagement",
  "router",
  "font",
  "primaryColor",
  "cardRadius",
  "navigation",
  "pageLayout",
] as const

const listFields = [
  "pages",
  "coreComponents",
  "directoryStructure",
  "dependencies",
] as const

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

function valueType(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) {
    if (value.length === 0) return "array(empty)"
    const itemTypes = [...new Set(value.map((item) => valueType(item)))]
    return `array(${itemTypes.join("|")})`
  }
  return typeof value
}

function detectSchemaDrift(data: JsonObject): string[] {
  const drift: string[] = []

  const framework = data.framework
  if (!framework || typeof framework !== "object" || Array.isArray(framework)) {
    drift.push(`framework expected object, got ${valueType(framework)}`)
  } else {
    const item = framework as JsonObject
    if (typeof item.name !== "string") {
      drift.push(`framework.name expected string, got ${valueType(item.name)}`)
    }
    if (typeof item.version !== "string") {
      drift.push(`framework.version expected string, got ${valueType(item.version)}`)
    }
  }

  for (const field of scalarFields) {
    if (typeof data[field] !== "string") {
      drift.push(`${field} expected string, got ${valueType(data[field])}`)
    }
  }

  for (const field of listFields) {
    const value = data[field]
    if (!Array.isArray(value)) {
      drift.push(`${field} expected string[], got ${valueType(value)}`)
      continue
    }
    if (!value.every((item) => typeof item === "string")) {
      drift.push(`${field} expected string[], got ${valueType(value)}`)
    }
  }

  return drift
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }

  if (value && typeof value === "object") {
    const object = value as JsonObject
    return Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, canonicalize(object[key])]),
    )
  }

  return value
}

function comparable(value: unknown): string {
  if (value === undefined) return "<missing>"
  if (typeof value === "string") return value.trim()
  return JSON.stringify(canonicalize(value)) ?? String(value)
}

function readField(observation: RunObservation, field: string): string {
  if (!observation.data) return "<unparseable>"
  return comparable(observation.data[field])
}

const dimensions = [
  "framework",
  "uiLibrary",
  "styling",
  "stateManagement",
  "router",
  "font",
  "primaryColor",
  "cardRadius",
  "navigation",
  "pageLayout",
  "pages",
  "coreComponents",
  "directoryStructure",
  "dependencies",
] as const

const provider = new DeepSeekProvider({ apiKey, baseUrl, model })
const observations: RunObservation[] = []

console.log("========== OpenUI Study 01.03 · Decision Drift ==========")
console.log(`provider : ${provider.name}`)
console.log(`model    : ${provider.model}`)
console.log(`runs     : ${runCount}`)
console.log("same business goal, same decision-sheet format, no frontend harness\n")

for (let index = 0; index < runCount; index += 1) {
  const response = await provider.chat({
    messages: [{ role: "user", content: prompt }],
  })

  let observation: RunObservation

  try {
    const data = extractJsonObject(response.content)
    observation = {
      rawText: response.content,
      data,
      schemaDrift: detectSchemaDrift(data),
    }
  } catch (error) {
    observation = {
      rawText: response.content,
      data: null,
      parseError: error instanceof Error ? error.message : String(error),
      schemaDrift: ["response could not be parsed as the requested JSON shape"],
    }
  }

  observations.push(observation)

  console.log(`---------- Run ${index + 1} ----------`)
  if (observation.data) {
    console.log(JSON.stringify(observation.data, null, 2))
  } else {
    console.log(observation.rawText)
  }

  if (observation.parseError) {
    console.log(`\n[UNPARSED] ${observation.parseError}`)
    console.log("这一类结构问题留到 04 · Schema Drift。")
  }

  console.log()
}

console.log("========== Decision Drift Comparison ==========")

const summary = dimensions.map((dimension) => {
  const values = observations.map((observation) => readField(observation, dimension))
  const uniqueValues = [...new Set(values)]
  return {
    dimension,
    unique: `${uniqueValues.length}/${observations.length}`,
    result: uniqueValues.length === 1 ? "STABLE_THIS_RUN" : "DRIFT",
  }
})

console.table(summary)

const driftDimensions = summary.filter((item) => item.result === "DRIFT")
console.log("========== Per-Run Values ==========")
for (const dimension of dimensions) {
  console.log(`\n[${dimension}]`)
  observations.forEach((observation, index) => {
    console.log(`Run ${index + 1}: ${readField(observation, dimension)}`)
  })
}

console.log("\n========== Observation ==========")
console.log(`drift decisions : ${driftDimensions.length}/${summary.length}`)
console.log(
  "同一个业务目标下，如果同一个 decision 出现多个值，说明这个决定仍然由 Model 在每次生成时重新选择。",
)
console.log(
  "STABLE_THIS_RUN 只代表当前 3 个样本一致，不代表它已经成为 Product / Harness 的系统规则。",
)
console.log(
  "下一节 04 · Schema Drift 再研究：连这张 Decision Sheet 的结构本身能不能只靠 Prompt 保证。",
)
