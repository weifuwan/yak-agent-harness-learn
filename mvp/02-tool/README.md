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

复用 DeepSeek 配置：

```env
MODEL_API_KEY=
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
```

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
校验 Tool name
↓
解析 / 校验 arguments
↓
执行 add()
↓
Tool Result
```

详细说明：[`04-execute-tool/README.md`](./04-execute-tool/README.md)

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
04 Execute Tool           ← 当前
05 Tool Result → Model    ← 后续
06 Multiple Tools         ← 后续
07 Unified Tool Interface ← 后续
```

---

# Tool 01 · Local Function

核心问题：**Tool 到底是什么？**

> **Tool = 程序可以执行的一项能力。**

```ts
function add(a: number, b: number) {
  return a + b
}
```

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

Schema 描述：

```text
name
description
parameters
type
required
```

详细说明：[`02-tool-schema/README.md`](./02-tool-schema/README.md)

---

# Tool 03 · Model Chooses Tool

核心问题：**模型看到 Tool Schema 后，怎么表达“我要调用这个 Tool”？**

```text
User Prompt
+
Tool Schema
↓
DeepSeek
↓
模型决定
├── 直接回答
└── 返回 tool_calls
```

当模型选择 `add`：

```text
finish_reason = tool_calls

message.tool_calls[0]
├── id
├── type = function
└── function
    ├── name = add
    └── arguments = {"a":123,"b":456}
```

这一节只生成调用意图，不执行 `add()`。

所以：

```text
Tool Call
≠
Tool Execution
```

详细说明：[`03-model-chooses-tool/README.md`](./03-model-chooses-tool/README.md)

---

# Tool 04 · Execute Tool

核心问题：**模型已经返回 Tool Call，谁真正执行？**

答案：**Application。**

职责边界：

```text
LLM
= 决定想调用什么

Application
= 解析、校验、执行

Tool
= 真正被执行的能力
```

当前完整流程：

```text
User Prompt
+
Tool Schema
↓
DeepSeek
↓
Tool Call
├── name = add
└── arguments = { a, b }
↓
Application
├── 校验 name
├── JSON.parse(arguments)
└── 校验 a / b 类型
↓
add(a, b)
↓
Tool Result
↓
STOP
```

为什么不能直接信任模型参数？

因为 `function.arguments` 是模型生成的数据。真正执行前必须：

```text
解析
↓
校验 Tool name
↓
校验 arguments
↓
执行
```

当前如果输入：

```text
请使用可用工具计算 123 + 456
```

预期会观察到：

```text
name = add
arguments = { a: 123, b: 456 }
↓
add(123, 456)
↓
579
```

但是当前仍然没有：

```text
role = tool            ❌
tool_call_id           ❌
把 579 发回 DeepSeek    ❌
第二次 LLM 请求        ❌
```

所以 `tool:04` 只解决：

> **谁真正执行 Tool，以及执行前为什么必须校验。**

详细说明：[`04-execute-tool/README.md`](./04-execute-tool/README.md)

---

## 下一步为什么是 Tool Result → Model？

现在程序已经拿到：

```text
Tool Result = 579
```

但 DeepSeek 不知道 Tool 最终执行出了什么。

所以自然出现下一个问题：

```text
Tool Result
↓
怎么重新交给模型？
```

下一节才会引入：

```text
role = tool
tool_call_id
第二次 LLM 请求
```

完整闭环会变成：

```text
User
↓
LLM
↓
Tool Call
↓
Execute Tool
↓
Tool Result
↓
LLM
↓
Assistant
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
- [ ] 我能解释 LLM / Application / Tool 的职责。
- [ ] 我知道 Tool name 要校验。
- [ ] 我知道 `function.arguments` 不能直接信任。
- [ ] 我能看懂 arguments 的解析与类型校验。
- [ ] 我知道 `add()` 是由应用程序真正调用的。
- [ ] 我能区分 Tool Call 和 Tool Result。
- [ ] 我知道当前 Tool Result 还没有回到模型。

做到这些，就进入 **tool:05 · Tool Result → Model**。
