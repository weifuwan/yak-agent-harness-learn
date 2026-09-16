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

需要 `.env` 中已经配置 Kimi：

```env
KIMI_API_KEY=
KIMI_BASE_URL=https://api.moonshot.cn/v1
KIMI_MODEL=kimi-k2.6
```

先测试一个需要工具的问题：

```bash
npm run tool:03 -- "请使用可用工具计算 123 + 456"
```

再测试一个不需要 `add` 的问题：

```bash
npm run tool:03 -- "请用一句话解释 Java HashMap"
```

重点观察：

```text
finish_reason
tool_calls
function.name
function.arguments
```

独立说明：[`03-model-chooses-tool/README.md`](./03-model-chooses-tool/README.md)

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
03 Model Chooses Tool     ← 当前
04 Execute Tool           ← 后续
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

运行：

```bash
npm run tool:01 -- 123 456
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

运行：

```bash
npm run tool:02
```

详细说明：[`02-tool-schema/README.md`](./02-tool-schema/README.md)

---

# Tool 03 · Model Chooses Tool

核心问题：**模型看到 Tool Schema 后，怎么表达“我要调用这个 Tool”？**

这一节第一次把 Schema 真正发给 LLM。

```text
User Prompt
+
Tool Schema
↓
Kimi
↓
模型决定
├── 直接回答
└── 返回 tool_calls
```

请求里第一次出现：

```text
tools
= 可供模型选择的 Tool Schema 列表

tool_choice = auto
= 是否使用 Tool，由模型根据当前问题决定
```

如果模型选择 `add`，通常会看到：

```text
finish_reason = tool_calls

message.tool_calls[0]
├── id
├── type = function
└── function
    ├── name = add
    └── arguments = {"a":123,"b":456}
```

当前代码会把 `function.arguments` 做 `JSON.parse()`，方便观察模型生成的参数。

但这一节**不会执行**：

```ts
add(123, 456)
```

所以当前完整流程停在：

```text
Tool Function
+
Tool Schema
↓
Schema 发给模型
↓
模型选择 Tool
↓
生成 Tool Call
↓
STOP
```

运行：

```bash
npm run tool:03 -- "请使用可用工具计算 123 + 456"
```

代码：[`03-model-chooses-tool/index.ts`](./03-model-chooses-tool/index.ts)

详细说明：[`03-model-chooses-tool/README.md`](./03-model-chooses-tool/README.md)

---

## 为什么 Tool Call 还不等于执行？

模型返回：

```text
name = add
arguments = { a: 123, b: 456 }
```

本质上只是：

> **模型生成了一份“调用意图”。**

模型没有在你的 Node 进程里真正运行：

```ts
add(123, 456)
```

真正执行 Tool 的仍然必须是我们的应用程序。

所以自然进入下一步：

```text
Tool 03
模型告诉程序“想调用什么”
↓
Tool 04
程序真正执行这个 Tool
```

---

## 当前 Done 标准

### Tool 01

- [ ] 我能解释 Tool 是一个可执行能力。
- [ ] 我能解释 Input / Execute / Output。

### Tool 02

- [ ] 我能解释 Tool Schema。
- [ ] 我知道 Function 和 Schema 职责不同。
- [ ] 我能解释 `name / description / parameters / required`。

### Tool 03

- [ ] 我知道 Tool Schema 是通过 `tools` 发给模型的。
- [ ] 我能解释 `tool_choice: auto`。
- [ ] 我能解释 `finish_reason: tool_calls`。
- [ ] 我能找到 `message.tool_calls[]`。
- [ ] 我能找到 `function.name`。
- [ ] 我能解析 `function.arguments`。
- [ ] 我知道 Tool Call 只是调用意图，不代表 Tool 已经执行。
- [ ] 我实际对比过“需要 add”和“不需要 add”的两个问题。

做到这些，就进入 **tool:04 · Execute Tool**。
