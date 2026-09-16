# 02 · Tool 学习

> 核心问题：**模型怎样从“会说”变成“能做”？**

当前原则：**每次只增加一个问题和一个能力。**

当前状态：`STAGE-1 COMPLETE`

---

## 快速测试

### Tool 01 · Local Function

```bash
npm run tool:01
```

### Tool 02 · Tool Schema

```bash
npm run tool:02
```

### Tool 03 · Model Chooses Tool

```bash
npm run tool:03 -- "请使用可用工具计算 123 + 456"
```

### Tool 04 · Execute Tool

```bash
npm run tool:04 -- "请使用可用工具计算 123 + 456"
```

### Tool 05 · Tool Result → Model

```bash
npm run tool:05 -- "请使用可用工具计算 123 + 456"
```

### Tool 06 · Multiple Tools

```bash
npm run tool:06 -- "请使用工具计算 123 + 456"
```

```bash
npm run tool:06 -- "请使用工具告诉我当前服务器时间"
```

```bash
npm run tool:06 -- "请读取 package.json，并告诉我项目名称"
```

### Tool 07 · Unified Tool Interface

同样测试三个场景：

```bash
npm run tool:07 -- "请使用工具计算 123 + 456"
```

```bash
npm run tool:07 -- "请使用工具告诉我当前服务器时间"
```

```bash
npm run tool:07 -- "请读取 package.json，并告诉我项目名称"
```

重点观察：

```text
Tool Registry
↓
Registry.get(name)
↓
Tool.execute(arguments)
```

详细说明：[`07-unified-tool-interface/README.md`](./07-unified-tool-interface/README.md)

---

## 学习路线

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

当前进度：

```text
01 Local Function         ✅
02 Tool Schema            ✅
03 Model Chooses Tool     ✅
04 Execute Tool           ✅
05 Tool Result → Model    ✅
06 Multiple Tools         ✅
07 Unified Tool Interface ← 当前
```

---

# Tool 01 · Local Function

核心问题：**Tool 到底是什么？**

> **Tool = 程序可以执行的一项能力。**

```text
Input
↓
Execute
↓
Output
```

详细说明：[`01-local-function/README.md`](./01-local-function/README.md)

---

# Tool 02 · Tool Schema

核心问题：**模型怎么知道 Tool 叫什么、做什么、需要哪些参数？**

```text
Function
= 给程序执行

Tool Schema
= 给模型理解
```

详细说明：[`02-tool-schema/README.md`](./02-tool-schema/README.md)

---

# Tool 03 · Model Chooses Tool

核心问题：**模型怎么表达“我要调用这个 Tool”？**

```text
User Prompt
+
Tool Schema
↓
DeepSeek
↓
Tool Call
├── name
└── arguments
```

这里第一次认识：

```text
tools
tool_choice
tool_calls
finish_reason = tool_calls
```

这一节只产生调用意图，不执行 Tool。

详细说明：[`03-model-chooses-tool/README.md`](./03-model-chooses-tool/README.md)

---

# Tool 04 · Execute Tool

核心问题：**谁真正执行 Tool？**

答案：**Application。**

```text
LLM
= 生成 Tool Call

Application
= 校验并执行

Tool
= 真正被调用的能力
```

```text
Tool Call
↓
校验 name / arguments
↓
执行 add()
↓
Tool Result
```

详细说明：[`04-execute-tool/README.md`](./04-execute-tool/README.md)

---

# Tool 05 · Tool Result → Model

核心问题：**Tool 已经执行出结果，模型怎么知道？**

```text
User
↓
LLM #1
↓
Tool Call
↓
Application 执行 Tool
↓
Tool Result
↓
role = tool
↓
LLM #2
↓
Final Assistant
```

这里认识：

```text
role = tool
tool_call_id
```

Tool Result 和 Final Assistant 不是一回事：

```text
Tool Result
= 程序执行结果

Final Assistant
= 模型读取 Tool Result 后组织出的最终回答
```

详细说明：[`05-tool-result-to-model/README.md`](./05-tool-result-to-model/README.md)

---

# Tool 06 · Multiple Tools

核心问题：**当 Tool 从 1 个变成多个，Application 怎么管理？**

这一节提供：

```text
add
get_current_time
read_file
```

模型负责选择：

```text
function.name = ?
```

Application 当前故意使用：

```ts
if (name === "add") {
  ...
}

if (name === "get_current_time") {
  ...
}

if (name === "read_file") {
  ...
}
```

这样会真实看到：

```text
Tool 越多
↓
Schema 越多
↓
参数解析 / 校验越多
↓
if / else 越长
↓
管理问题出现
```

这就是 `tool:07` 抽象出现的原因。

详细说明：[`06-multiple-tools/README.md`](./06-multiple-tools/README.md)

---

# Tool 07 · Unified Tool Interface

核心问题：**怎么让所有 Tool 用同一种方式被描述、查找和执行？**

这一节第一次定义统一契约：

```ts
interface Tool {
  name: string
  description: string
  parameters: Record<string, unknown>

  execute(rawArguments: string): Promise<string>
}
```

每个 Tool 自己拥有：

```text
name
+ description
+ parameters
+ execute()
```

所以：

```text
addTool
getCurrentTimeTool
readFileTool
```

虽然内部逻辑完全不同，但对主流程来说都是：

```text
Tool
```

## Tool Registry

所有 Tool 注册到：

```ts
Map<string, Tool>
```

概念上：

```text
add              → addTool
get_current_time → getCurrentTimeTool
read_file        → readFileTool
```

于是 `tool:06` 的：

```text
if / else 分发
```

变成：

```ts
const tool = toolRegistry.get(name)
const result = await tool.execute(rawArguments)
```

## Schema 也从 Tool 对象生成

不再单独维护：

```text
addToolSchema
readFileToolSchema
...
```

而是：

```text
Tool Object
├── name
├── description
├── parameters
└── execute
     │
     ├→ 生成给 LLM 的 Schema
     └→ Application 真正执行
```

当前完整结构：

```text
addTool
getCurrentTimeTool
readFileTool
       ↓
Tool Registry
       ↓
生成 tools Schema
       ↓
DeepSeek
       ↓
Tool Call
       ↓
Registry.get(name)
       ↓
Tool.execute(arguments)
       ↓
Tool Result
       ↓
DeepSeek
       ↓
Final Assistant
```

详细说明：[`07-unified-tool-interface/README.md`](./07-unified-tool-interface/README.md)

---

## 为什么 Tool 第一阶段可以先封板？

现在已经理解并实现：

```text
Tool 是什么
↓
怎么描述 Tool
↓
模型怎么选择 Tool
↓
谁真正执行 Tool
↓
Tool Result 怎么回给模型
↓
多个 Tool 怎么选择
↓
多个 Tool 怎么统一管理
```

这已经足够支撑后面的 Agent Engineering。

当前仍然没有解决：

```text
LLM
↓
Tool
↓
LLM
↓
又返回 Tool Call
↓
Tool
↓
LLM
...
```

也就是说：

> **谁负责让 LLM → Tool → LLM 自动持续运行，又什么时候停止？**

这个问题自然进入下一阶段：

# 03 · Agent Loop

---

## Tool 07 Done 标准

- [ ] 我能解释为什么 `tool:06` 之后才需要 Tool 抽象。
- [ ] 我能解释 `Tool` 接口的 `name / description / parameters / execute`。
- [ ] 我知道 Tool 自己拥有 Schema 和执行逻辑。
- [ ] 我能解释 Tool Registry。
- [ ] 我能看懂 `toolRegistry.get(name)`。
- [ ] 我能看懂统一的 `tool.execute(rawArguments)`。
- [ ] 我知道发给模型的 Schema 可以从 Tool 对象自动生成。
- [ ] 我知道主流程不再认识具体 Tool 的内部实现。
- [ ] 我知道当前仍然只允许一次 Tool Call，还不是 Agent Loop。

做到这些，`02 · Tool` 第一阶段就可以先封板。
