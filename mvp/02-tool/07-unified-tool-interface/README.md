# Tool 07 · Unified Tool Interface

核心问题：**Tool 越来越多以后，怎么让它们用同一种方式被描述、查找和执行？**

`tool:06` 已经真实暴露出问题：

```text
Tool 越多
↓
Schema 越多
↓
参数解析 / 校验越多
↓
if / else 分发越来越长
```

所以这一节才开始抽象。

> **先有真实管理问题，再提取统一 Tool 接口。**

---

## 06 的问题在哪里？

`tool:06` 里，Application 需要知道每个具体 Tool：

```ts
if (name === "add") {
  // parse add args
  // execute add
}

if (name === "get_current_time") {
  // execute time
}

if (name === "read_file") {
  // parse path
  // execute read_file
}
```

也就是说主流程同时承担：

```text
识别 Tool
参数解析
参数校验
执行 Tool
```

Tool 一多，主流程就会越来越大。

---

## 07 定义统一 Tool 接口

代码：[`types.ts`](./types.ts)

最小接口：

```ts
interface Tool {
  name: string
  description: string
  parameters: Record<string, unknown>

  execute(rawArguments: string): Promise<string>
}
```

当前只保留 4 个东西：

```text
name
= Tool 唯一名字

description
= 告诉模型 Tool 是干什么的

parameters
= Tool 参数 Schema

execute()
= 真正执行 Tool
```

这就是这一节的统一契约。

---

## Tool 自己拥有 Schema + Execute

代码：[`tools.ts`](./tools.ts)

例如 `addTool`：

```ts
const addTool: Tool = {
  name: "add",
  description: "计算两个数字之和。",
  parameters: {
    // a / b JSON Schema
  },

  async execute(rawArguments) {
    // JSON.parse
    // 校验 a / b
    // return a + b
  }
}
```

所以以前散落的：

```text
addToolSchema
parseAddArguments
add()
executeTool() 中的 add 分支
```

现在收进同一个 Tool 对象。

同样：

```text
getCurrentTimeTool
readFileTool
```

都实现同一个 `Tool` 接口。

---

## Registry 是什么？

如果模型返回：

```text
name = read_file
```

程序需要找到对应 Tool。

所以建立一个最简单的 Registry：

```ts
Map<string, Tool>
```

概念上就是：

```text
add              → addTool
get_current_time → getCurrentTimeTool
read_file        → readFileTool
```

查找时：

```ts
const tool = toolRegistry.get(name)
```

执行时：

```ts
const result = await tool.execute(rawArguments)
```

主流程不再关心具体 Tool 的内部实现。

---

## 06 和 07 的区别

### Tool 06

```text
Tool Call
↓
if name === add
if name === time
if name === read_file
↓
不同执行分支
```

### Tool 07

```text
Tool Call
↓
Registry.get(name)
↓
Tool.execute(arguments)
↓
Tool Result
```

所以可以记成：

> **06 先让 Tool 管理问题出现；07 再把管理方式统一。**

---

## Schema 也不需要维护两份

这一节还有一个重要变化。

以前发给模型的是手工数组：

```ts
const tools = [
  addToolSchema,
  getCurrentTimeToolSchema,
  readFileToolSchema,
]
```

现在直接从 Tool 对象生成：

```ts
const toolSchemas = [...toolRegistry.values()].map((tool) => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
}))
```

于是同一个 Tool 定义同时负责：

```text
给模型看的 Schema
+
给程序执行的 execute()
```

减少 Schema 和实际执行逻辑发生漂移的机会。

---

## 当前完整流程

```text
Tool Objects
├── addTool
├── getCurrentTimeTool
└── readFileTool
       ↓
Tool Registry
       ↓
生成 tools Schema
       ↓
DeepSeek
       ↓
Tool Call
name + arguments
       ↓
Registry.get(name)
       ↓
Tool.execute(arguments)
       ↓
Tool Result
       ↓
role = tool
       ↓
DeepSeek
       ↓
Final Assistant
```

---

## 运行

还是可以测试三个场景。

加法：

```bash
npm run tool:07 -- "请使用工具计算 123 + 456"
```

当前时间：

```bash
npm run tool:07 -- "请使用工具告诉我当前服务器时间"
```

读文件：

```bash
npm run tool:07 -- "请读取 package.json，并告诉我项目名称"
```

重点观察：

```text
[Tool Registry]

[Registry Lookup]

[Unified Execute]
```

不管模型选哪个 Tool，主流程的执行方式都是：

```ts
toolRegistry.get(name)
↓
tool.execute(rawArguments)
```

---

## 当前仍然故意限制什么？

```text
一次响应多个 Tool Calls ❌
Agent Loop                  ❌
泛型 Tool<TInput, TOutput> ❌
Permission                  ❌
Retry                       ❌
Middleware / Hook           ❌
Telemetry                   ❌
动态插件加载                 ❌
```

现在只解决：

> **多个 Tool 怎么统一描述、统一查找、统一执行。**

---

## 为什么 Tool 第一阶段到这里可以封板？

因为我们已经完整经历：

```text
01 Local Function
↓
02 Tool Schema
↓
03 Model Chooses Tool
↓
04 Execute Tool
↓
05 Tool Result → Model
↓
06 Multiple Tools
↓
07 Unified Tool Interface
```

现在已经有：

```text
LLM 可以选择 Tool
Application 可以执行 Tool
Tool Result 可以回到 LLM
多个 Tool 可以统一管理
```

真正还没解决的是：

```text
LLM
↓
Tool
↓
LLM
↓
又想调用 Tool
↓
怎么办？
```

这个问题不再属于 Tool Definition / Tool Management。

它会自然进入下一阶段：

**03 · Agent Loop**。

---

## Done 标准

- [ ] 我能解释为什么 `tool:06` 开始需要抽象。
- [ ] 我能解释 `Tool` 接口的 `name / description / parameters / execute`。
- [ ] 我知道一个 Tool 自己拥有 Schema 和执行逻辑。
- [ ] 我能解释 Tool Registry 是什么。
- [ ] 我能看懂 `toolRegistry.get(name)`。
- [ ] 我能看懂 `tool.execute(rawArguments)`。
- [ ] 我知道发给模型的 Schema 可以直接从 Tool 对象生成。
- [ ] 我知道主流程现在不需要认识 add / time / read_file 的内部逻辑。
- [ ] 我能解释为什么这一阶段还不是 Agent Loop。

做到这些，`02 · Tool` 第一阶段就可以封板。
