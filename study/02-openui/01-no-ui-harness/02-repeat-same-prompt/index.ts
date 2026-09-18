import { DeepSeekProvider } from "../../../../mvp/01-llm/07-unified-llm-interface/deepseek-provider.js"

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").trim()
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Fill it in .env first.")
}

const prompt = "帮我做一个数据同步系统的前端"

const provider = new DeepSeekProvider({
  apiKey,
  baseUrl,
  model,
})

console.log("========== OpenUI Study 01.02 · Repeat Same Prompt ==========")
console.log(`provider : ${provider.name}`)
console.log(`model    : ${provider.model}`)
console.log("runs     : 2")
console.log()
console.log("========== Fixed Prompt ==========")
console.log(prompt)
console.log()
console.log("两个 Run 完全独立，不共享上一轮回答。")
console.log()

for (let run = 1; run <= 2; run += 1) {
  const response = await provider.chat({
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  })

  console.log(`========== Run ${run} · Model Output ==========`)
  console.log(response.content)
  console.log()
}

console.log("========== Observation ==========")
console.log("现在只做肉眼比较，不做自动统计。")
console.log()
console.log("重点看两个 Run 在这些方面是否一样：")
console.log("- 技术方案：HTML / React / Vue / 其他")
console.log("- UI / CSS 方案")
console.log("- 主题、颜色、字体、圆角")
console.log("- Sidebar / TopNav / 页面布局")
console.log("- 页面与业务模块")
console.log("- 组件与交互")
console.log("- 目录、依赖、代码组织")
console.log()
console.log("这一节只回答：同一句 Prompt 再生成一次，模型会不会重复同一组前端决定？")
console.log("不要在这一节统计差异数量；结构化 Decision Drift 留到下一节。")
