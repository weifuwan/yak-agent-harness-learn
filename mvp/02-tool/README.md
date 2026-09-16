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
05 Tool Result → Model    ← 当前
06 Multiple Tools         ← 后续
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

这一节结束时：

```text
程序知道结果
模型还不知道结果
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

第一次请求的 messages：

```text
system
user
```

模型返回 Tool Call 后，应用把它加入历史，再加入 Tool Result：

```text
system
user
assistant(tool_calls)
tool(tool_call_id + content)
```

第二次请求就能看到完整发生过程。

## role = tool

Tool Result 会作为一条新的消息：

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

所以：

```text
Tool Result
579

≠

Final Assistant
123 + 456 = 579。
```

Tool 负责执行，LLM 负责继续理解和组织回答。

当前代码第二次请求使用：

```text
tool_choice = none
```

因为这一节只学习固定的一次闭环，不允许模型继续产生新的 Tool Call。

详细说明：[`05-tool-result-to-model/README.md`](./05-tool-result-to-model/README.md)

---

## 为什么 05 还不是 Agent Loop？

当前流程是写死的：

```text
LLM
↓
最多一次 Tool Call
↓
Tool Result
↓
LLM
↓
结束
```

它还不会：

```text
LLM
↓
Tool
↓
LLM
↓
Tool
↓
LLM
...
```

什么时候继续、什么时候停，目前都不是一个自动循环。

所以 Agent Loop 还没有出现。

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

- [ ] 我知道为什么 Tool Result 要再次交给模型。
- [ ] 我能解释 `role = tool`。
- [ ] 我能解释 `tool_call_id`。
- [ ] 我知道 Assistant Tool Call Message 也要放回 messages。
- [ ] 我能看懂第二次请求的完整消息历史。
- [ ] 我能区分 Tool Result 和 Final Assistant。
- [ ] 我知道一个用户请求为什么会产生两次 LLM 请求。
- [ ] 我知道当前只是一次固定闭环，还不是 Agent Loop。

做到这些，就进入 **tool:06 · Multiple Tools**。
