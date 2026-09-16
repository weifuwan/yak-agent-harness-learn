function add(a: number, b: number): number {
  return a + b
}

const addToolSchema = {
  type: "function",
  function: {
    name: "add",
    description: "计算两个数字之和。",
    parameters: {
      type: "object",
      properties: {
        a: {
          type: "number",
          description: "第一个加数。",
        },
        b: {
          type: "number",
          description: "第二个加数。",
        },
      },
      required: ["a", "b"],
      additionalProperties: false,
    },
  },
} as const

console.log("========== Tool 02 · Tool Schema ==========")
console.log("这一节仍然没有 LLM。只给 add() 增加一份模型可理解的说明书。")

console.log("\n[Executable Function]")
console.log(add.toString())

console.log("\n[Tool Schema]")
console.log(JSON.stringify(addToolSchema, null, 2))

console.log("\n[Schema 告诉模型什么？]")
console.log(`name        : ${addToolSchema.function.name}`)
console.log(`description : ${addToolSchema.function.description}`)
console.log(`parameters  : ${Object.keys(addToolSchema.function.parameters.properties).join(", ")}`)
console.log(`required    : ${addToolSchema.function.parameters.required.join(", ")}`)

console.log("\n[关键观察]")
console.log("add() 是真正可以被程序执行的能力。")
console.log("Tool Schema 只是描述 add()：名字、用途、参数结构。")
console.log("Schema 本身不会执行 add()，模型也还没有参与。")
