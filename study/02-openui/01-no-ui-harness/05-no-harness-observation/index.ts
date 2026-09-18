type ExperimentSummary = {
  experiment: string
  observation: string
  conclusion: string
}

type OwnershipRow = {
  decision: string
  currentOwner: "User/Product" | "Model" | "Prompt" | "Runtime"
  runtimeGuaranteed: "YES" | "NO"
  evidence: string
}

const experiments: ExperimentSummary[] = [
  {
    experiment: "01 Single Generation",
    observation: "一句业务需求下，Model 主动补齐技术、视觉、页面、组件与业务细节。",
    conclusion: "没有 Harness 时，大量前端决定默认属于 Model。",
  },
  {
    experiment: "02 Repeat Same Prompt",
    observation: "同一个 Prompt 独立生成两次，技术方案与视觉方案都发生变化。",
    conclusion: "当规则属于 Model，重新生成就等于重新做一次决定。",
  },
  {
    experiment: "03 Decision Drift",
    observation: "当前 3 个样本中，14 个观察维度有 12 个出现字符串级 Drift。",
    conclusion: "不只是 UI 会漂，产品范围与工程复杂度也会被重新决定。",
  },
  {
    experiment: "04 Schema Drift",
    observation: "明确 Schema Prompt 后，当前 5 个样本全部匹配；历史大量重复测试中曾观察到结构错误。",
    conclusion: "Prompt 可以提高稳定性，但 Compliance 不等于 Runtime Enforcement。",
  },
]

const ownership: OwnershipRow[] = [
  {
    decision: "业务目标",
    currentOwner: "User/Product",
    runtimeGuaranteed: "NO",
    evidence: "用户只明确提出“数据同步系统前端”。",
  },
  {
    decision: "技术栈",
    currentOwner: "Model",
    runtimeGuaranteed: "NO",
    evidence: "曾出现 Vanilla HTML/CSS/JS 与 React/Tailwind 等不同方案。",
  },
  {
    decision: "UI Library",
    currentOwner: "Model",
    runtimeGuaranteed: "NO",
    evidence: "没有系统级组件白名单。",
  },
  {
    decision: "Styling Strategy",
    currentOwner: "Model",
    runtimeGuaranteed: "NO",
    evidence: "Tailwind、CSS Modules、组合方案均由 Model 选择。",
  },
  {
    decision: "视觉 Tokens",
    currentOwner: "Model",
    runtimeGuaranteed: "NO",
    evidence: "颜色、字体、圆角等主要由 Model 补齐。",
  },
  {
    decision: "页面范围",
    currentOwner: "Model",
    runtimeGuaranteed: "NO",
    evidence: "同一需求下页面数量曾出现 9 / 10 / 12。",
  },
  {
    decision: "组件集合",
    currentOwner: "Model",
    runtimeGuaranteed: "NO",
    evidence: "同一需求下核心组件数量曾出现 12 / 16 / 37。",
  },
  {
    decision: "目录结构",
    currentOwner: "Model",
    runtimeGuaranteed: "NO",
    evidence: "目录粒度与组织方式会随生成变化。",
  },
  {
    decision: "依赖集合",
    currentOwner: "Model",
    runtimeGuaranteed: "NO",
    evidence: "额外依赖会随生成增减。",
  },
  {
    decision: "输出 Schema",
    currentOwner: "Prompt",
    runtimeGuaranteed: "NO",
    evidence: "强 Prompt 当前样本稳定，但没有 Runtime Enforcement。",
  },
]

console.log("========== OpenUI Study 01.05 · No Harness Observation ==========")
console.log()

console.log("========== Experiment Summary ==========")
console.table(experiments)

console.log("========== Decision Ownership Map ==========")
console.table(ownership)

const modelOwned = ownership.filter((item) => item.currentOwner === "Model")
const promptOwned = ownership.filter((item) => item.currentOwner === "Prompt")
const guaranteed = ownership.filter((item) => item.runtimeGuaranteed === "YES")

console.log("========== Count ==========")
console.log(`observed decision areas : ${ownership.length}`)
console.log(`model-owned            : ${modelOwned.length}`)
console.log(`prompt-constrained      : ${promptOwned.length}`)
console.log(`runtime-guaranteed      : ${guaranteed.length}`)
console.log()

console.log("========== Chapter Conclusion ==========")
console.log(
  "No Harness 的核心问题不是“Model 一定会乱”，而是关键决策权和约束执行权仍然主要留在 Model。",
)
console.log()
console.log(
  "Prompt 可以告诉 Model 应该怎么做，但如果 Runtime 不检查，它仍然不是系统级保证。",
)
console.log()
console.log("当前链路：")
console.log()
console.log("User/Product")
console.log("  ↓ 业务目标")
console.log("Prompt")
console.log("  ↓ 描述期望")
console.log("Model")
console.log("  ↓ 补齐大量前端决策")
console.log("Frontend Output")
console.log()
console.log("缺少的是：")
console.log()
console.log("System-owned Constraints")
console.log("  ↓")
console.log("明确哪些决定不能继续交给 Model 临时选择")
console.log()

console.log("========== Next Question ==========")
console.log(
  "如果只拿回第一小块确定性，最适合先拿什么？",
)
console.log()
console.log("→ Component Library")
console.log("→ 先明确：Model 到底允许使用哪些 UI 组件。")
