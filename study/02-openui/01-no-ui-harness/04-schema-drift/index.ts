import { DeepSeekProvider } from "../../../../mvp/01-llm/07-unified-llm-interface/deepseek-provider.js"

type JsonObject = Record<string, unknown>

type RunObservation = {
  run: number
  data: JsonObject | null
  violations: string[]
  signatures: Record<string, string>
}

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").trim()
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const runCount = 5

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

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

const schemaFields = [
  "framework",
  ...scalarFields,
  ...listFields,
] as const

const expectedTopLevelKeys = [...schemaFields]

const prompt = `帮我做一个“数据同步系统”的前端方案。

你拥有完全决定权：技术栈、样式方案、页面、组件、目录和依赖都由你自己选择。

但是为了做结构稳定性实验，你的输出格式必须严格满足下面的规则：

1. 只返回一个合法 JSON 对象，不要 Markdown，不要解释。
2. 顶层必须且只能包含下面 14 个字段，不能增加、删除、改名。
3. framework 必须是对象，并且只能包含 name 和 version，两个值都必须是 string。
4. uiLibrary、styling、stateManagement、router、font、primaryColor、cardRadius、navigation、pageLayout 必须是 string。
5. pages、coreComponents、directoryStructure、dependencies 必须是 string[]，数组里的每一项都必须是 string。

严格结构：
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
  "pages": [""],
  "coreComponents": [""],
  "directoryStructure": [""],
  "dependencies": [""]
}

重要：这里只固定数据结构，不固定任何前端答案。`

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

function shapeOf(value: unknown): string {
  if (value === undefined) return "missing"
  if (value === null) return "null"

  if (Array.isArray(value)) {
    if (value.length === 0) return "array<empty>"

    const itemShapes = [...new Set(value.map((item) => shapeOf(item)))].sort()
    return `array<${itemShapes.join("|")}>`
  }

  if (typeof value === "object") {
    const object = value as JsonObject
    const entries = Object.keys(object)
      .sort()
      .map((key) => `${key}:${shapeOf(object[key])}`)

    return `object{${entries.join(",")}}`
  }

  return typeof value
}

function validateSchema(data: JsonObject): string[] {
  const violations: string[] = []
  const actualKeys = Object.keys(data)

  for (const key of expectedTopLevelKeys) {
    if (!(key in data)) {
      violations.push(`missing top-level field: ${key}`)
    }
  }

  for (const key of actualKeys) {
    if (!expectedTopLevelKeys.includes(key as (typeof schemaFields)[number])) {
      violations.push(`unexpected top-level field: ${key}`)
    }
  }

  const framework = data.framework

  if (!framework || typeof framework !== "object" || Array.isArray(framework)) {
    violations.push(
      `framework expected object{name:string,version:string}, got ${shapeOf(framework)}`,
    )
  } else {
    const object = framework as JsonObject

    if (typeof object.name !== "string") {
      violations.push(
        `framework.name expected string, got ${shapeOf(object.name)}`,
      )
    }

    if (typeof object.version !== "string") {
      violations.push(
        `framework.version expected string, got ${shapeOf(object.version)}`,
      )
    }

    for (const key of Object.keys(object)) {
      if (key !== "name" && key !== "version") {
        violations.push(`framework has unexpected field: ${key}`)
      }
    }
  }

  for (const field of scalarFields) {
    if (typeof data[field] !== "string") {
      violations.push(
        `${field} expected string, got ${shapeOf(data[field])}`,
      )
    }
  }

  for (const field of listFields) {
    const value = data[field]

    if (!Array.isArray(value)) {
      violations.push(
        `${field} expected string[], got ${shapeOf(value)}`,
      )
      continue
    }

    if (!value.every((item) => typeof item === "string")) {
      violations.push(
        `${field} expected string[], got ${shapeOf(value)}`,
      )
    }
  }

  return violations
}

function collectSignatures(
  data: JsonObject | null,
): Record<string, string> {
  return Object.fromEntries(
    schemaFields.map((field) => [
      field,
      data ? shapeOf(data[field]) : "<unparseable>",
    ]),
  )
}

const provider = new DeepSeekProvider({
  apiKey,
  baseUrl,
  model,
})

const observations: RunObservation[] = []

console.log("========== OpenUI Study 01.04 · Schema Drift ==========")
console.log(`provider : ${provider.name}`)
console.log(`model    : ${provider.model}`)
console.log(`runs     : ${runCount}`)
console.log("same prompt-only schema contract, no runtime schema enforcement")
console.log()

for (let run = 1; run <= runCount; run += 1) {
  const response = await provider.chat({
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  })

  let data: JsonObject | null = null
  let violations: string[] = []

  try {
    data = extractJsonObject(response.content)
    violations = validateSchema(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    violations = [`unparseable JSON: ${message}`]
  }

  const observation: RunObservation = {
    run,
    data,
    violations,
    signatures: collectSignatures(data),
  }

  observations.push(observation)

  console.log(`---------- Run ${run} ----------`)
  console.log(`parseable  : ${data ? "yes" : "no"}`)
  console.log(`violations : ${violations.length}`)

  if (violations.length === 0) {
    console.log("schema     : EXPECTED_MATCH")
  } else {
    console.log("schema     : SCHEMA_VIOLATION")

    for (const item of violations) {
      console.log(`- ${item}`)
    }
  }

  console.log("field shapes:")

  for (const field of schemaFields) {
    console.log(`- ${field}: ${observation.signatures[field]}`)
  }

  console.log()
}

console.log("========== Per-Run Schema Result ==========")

console.table(
  observations.map((observation) => ({
    run: observation.run,
    parseable: observation.data ? "YES" : "NO",
    violations: observation.violations.length,
    result:
      observation.violations.length === 0
        ? "EXPECTED_MATCH"
        : "SCHEMA_VIOLATION",
  })),
)

console.log("========== Shape Drift Comparison ==========")

const shapeSummary = schemaFields.map((field) => {
  const shapes = observations.map(
    (observation) => observation.signatures[field] ?? "missing",
  )
  const uniqueShapes = [...new Set(shapes)]

  return {
    field,
    uniqueShapes: `${uniqueShapes.length}/${observations.length}`,
    result:
      uniqueShapes.length === 1
        ? "STABLE_SHAPE_THIS_RUN"
        : "SCHEMA_DRIFT",
  }
})

console.table(shapeSummary)

const violatingRuns = observations.filter(
  (observation) => observation.violations.length > 0,
)

const driftFields = shapeSummary.filter(
  (item) => item.result === "SCHEMA_DRIFT",
)

console.log("========== Observation ==========")
console.log(
  `schema violation runs : ${violatingRuns.length}/${observations.length}`,
)
console.log(
  `shape drift fields    : ${driftFields.length}/${shapeSummary.length}`,
)
console.log()
console.log("Schema Violation = 某一次输出没有匹配期望 Schema。")
console.log(
  "Schema Drift     = 多次 Run 之间，同一个字段的实际 Shape 发生变化。",
)
console.log(
  "即使 5 次都匹配，也只能说明当前样本遵守了 Prompt；Prompt 本身仍不是 Runtime Schema Enforcement。",
)
console.log(
  "下一节 05 · No Harness Observation 会把 01～04 的结论收口。",
)
