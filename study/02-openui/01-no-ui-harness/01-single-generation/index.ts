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

console.log("========== OpenUI Study 01.01 · Single Generation ==========")
console.log(`provider : ${provider.name}`)
console.log(`model    : ${provider.model}`)
console.log()
console.log("========== User Prompt ==========")
console.log(prompt)
console.log()

const response = await provider.chat({
  messages: [
    {
      role: "user",
      content: prompt,
    },
  ],
})

console.log("========== Model Output ==========")
console.log(response.content)
console.log()

console.log("========== Observation ==========")
console.log("这次没有给任何 Frontend Harness，也没有指定技术栈、组件库、设计系统或页面结构。")
console.log("请只观察：模型为了完成这一句需求，主动替产品做了哪些前端决定。")
console.log()
console.log("可以从这些维度找：")
console.log("- framework / version")
console.log("- UI library / styling")
console.log("- router / state management")
console.log("- font / color / radius")
console.log("- navigation / page layout")
console.log("- pages / components")
console.log("- directory / dependencies")
console.log()
console.log("这一节先不要判断“选得好不好”。")
console.log("只回答一个问题：这些决定，是用户决定的，还是模型自己补出来的？")
