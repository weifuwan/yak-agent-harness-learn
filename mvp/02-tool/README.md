# 02 · Tool 学习

> 核心问题：**模型怎样从“会说”变成“能做”？**

当前原则：**每次只增加一个问题和一个能力。**

当前状态：`LEARNING`

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

重点看：

```text
finish_reason
tool_calls
function.name
function.arguments
```

详细说明：[`03-model-chooses-tool/README.md`](./03-model-chooses-tool/README.md)

### Tool 04 · Execute Tool

```bash
npm run tool:04 -- "请使用可用工具计算 123 + 456"
```

重点看：

```text
Tool Call
↓
校验 name / arguments
↓
Application 执行 add()
↓
Tool Result
```

详细说明：[`04-execute-tool/README.md`](./04-execute-tool/README.md)

### Tool 05 · Tool Result → Model

```bash
npm run tool:05 -- "请使用可用工具计算 123 + 456"
```

重点看：

```text
First LLM Request
↓
Tool Call
↓
Tool Result
↓
role = tool
↓
Second LLM Request
↓
Final Assistant
```

详细说明：[`05-tool-result-to-model/README.md`](./05-tool-result-to-model/README.md)

### Tool 06 · Multiple Tools

这次一次提供 3 个 Tool：

```text
add
get_current_time
read_file
```

分别测试：

```bash
npm run tool:06 -- "请使用工具计算 123 + 456"
```

```bash
npm run tool:06 -- "请使用工具告诉我当前服务器时间"
```

```bash
npm run tool:06 -- "请读取 package.json，并告诉我项目名称"
```

重点看：

```text
function.name
↓
Application 根据 name 分发
↓
执行不同 Tool
```

详细说明：[`06-multiple-tools/README.md`](./06-multiple-tools/README.md)

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
06 Multiple Tools         ← 当前
07 Unified Tool Interface ← 后续
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
add()
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

流程：

```text
Tool Call
↓
校验 Tool name
↓
解析 / 校验 arguments
↓
add(a, b)
↓
Tool Result
↓
STOP
```

详细说明：[`04-execute-tool/README.md`](./04-execute-tool/README.md)

---

# Tool 05 · Tool Result → Model

核心问题：**Tool 已经执行出结果，模型怎么知道？**

这一节第一次完成最小闭环：

```text
User
↓
第一次 LLM 调用
↓
Tool Call
↓
Application 执行 Tool
↓
Tool Result
↓
role = tool
↓
第二次 LLM 调用
↓
Final Assistant
```

Tool Result 会作为一条新消息：

```json
{
  "role": "tool",
  "tool_call_id": "call_xxx",
  "content": "579"
}
```

其中：

```text
tool_call_id
= 关联之前哪一次 Tool Call

content
= Tool 真正执行出来的结果
```

当前仍然是固定闭环，不是 Agent Loop。

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

模型会先根据 User Prompt 选择 Tool：

```text
User
↓
DeepSeek
↓
function.name = ?
```

Application 当前直接用：

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

完整流程：

```text
User
↓
DeepSeek
↓
从多个 Tools 中选择
↓
Tool Call
↓
Application
↓
if / else 分发
↓
执行对应 Tool
↓
Tool Result
↓
role = tool
↓
DeepSeek
↓
Final Assistant
```

## Multiple Tools ≠ Multiple Tool Calls

这一节的 Multiple Tools 指的是：

```text
模型有多个 Tool 可以选
```

不是：

```text
一次响应同时执行多个 Tool Call
```

为了保持学习边界，当前代码一次运行只接受一个 Tool Call。

## 为什么这一节故意保留 if / else？

因为现在开始真正看到：

```text
Tool 越多
↓
Schema 越多
↓
参数解析越多
↓
参数校验越多
↓
执行分支越多
↓
管理开始变乱
```

如果继续增加：

```text
write_file
list_files
search
run_command
...
```

代码会越来越难维护。

所以这一节不是为了“多写几个 Tool”，而是为了让管理问题真实出现。

详细说明：[`06-multiple-tools/README.md`](./06-multiple-tools/README.md)

---

## 下一步为什么是 Unified Tool Interface？

现在已经真实出现：

```text
Tool Schema 分散
参数校验分散
执行函数分散
if / else 分发增长
```

所以下一步才有理由把它们收敛成类似：

```text
Tool
├── name
├── description / schema
└── execute()
```

然后通过 Registry 按名字找到 Tool。

也就是：

```text
Tool 06
先看到管理问题
↓
Tool 07
再解决管理问题
```

---

## 当前 Done 标准

### Tool 01

- [ ] 我能解释 Tool 是一个可执行能力。

### Tool 02

- [ ] 我能解释 Tool Schema。
- [ ] 我知道 Function 和 Schema 职责不同。

### Tool 03

- [ ] 我能解释 `tools / tool_choice / tool_calls`。
- [ ] 我知道 Tool Call 只是调用意图。

### Tool 04

- [ ] 我知道模型不会自己执行本地函数。
- [ ] 我知道 Tool 执行前必须校验 name / arguments。
- [ ] 我能区分 Tool Call 和 Tool Result。

### Tool 05

- [ ] 我知道 Tool Result 为什么要再次交给模型。
- [ ] 我能解释 `role = tool / tool_call_id`。
- [ ] 我知道一个用户请求为什么会有两次 LLM 请求。

### Tool 06

- [ ] 我知道 Multiple Tools 表示模型有多个 Tool 可以选择。
- [ ] 我实际测试过 `add / get_current_time / read_file`。
- [ ] 我知道 Application 根据 `function.name` 分发执行。
- [ ] 我能看懂当前 `if / else` 分发逻辑。
- [ ] 我能区分 Multiple Tools 和 Multiple Tool Calls。
- [ ] 我知道当前一次运行仍然只接受一个 Tool Call。
- [ ] 我能解释 Tool 增加以后为什么需要统一管理。

做到这些，就进入 **tool:07 · Unified Tool Interface**。
