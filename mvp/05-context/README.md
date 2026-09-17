# 05 · Context 学习

> 核心问题：**Session 保存了全部历史，但这一轮模型到底应该看到什么？**

当前原则：**先让问题暴露，再让 Builder、Sources、Selection、Safe Units 一层层自然长出来。**

当前状态：`LEARNING`

---

## 学习路线

```text
01 Full Session As Context
   ↓
02 Explicit Context Builder
   ↓
03 Context Sources
   ↓
04 History Selection
   ↓
05 Safe Context Units
   ↓
06 Minimal Context Runtime
```

当前进度：

```text
01 Full Session As Context   ✅
02 Explicit Context Builder  ✅
03 Context Sources           ✅
04 History Selection         ✅
05 Safe Context Units        ← 当前
06 Minimal Context Runtime   ← 后续
```

---

## Session 和 Context

```text
Session
= 完整事实历史

Context
= 本轮实际发送给模型的信息
```

所以：

> **完整保存，不等于全部发送。**

---

# Context 01 · Full Session As Context

```bash
npm run context:01
```

故意让：

```text
Session 有多少历史
↓
Context 就塞多少
```

看到第一个问题：

> **Session 负责保存，但不应该顺便决定模型本轮看到什么。**

记成：

```text
01 = Full Session
```

详细：[`01-full-session-as-context/README.md`](./01-full-session-as-context/README.md)

---

# Context 02 · Explicit Context Builder

```bash
npm run context:02
```

第一次引入：

```text
Session
↓
buildContext()
↓
Model Context
↓
LLM
```

行为暂时不变，但职责正式分开。

记成：

```text
02 = Builder
```

详细：[`02-explicit-context-builder/README.md`](./02-explicit-context-builder/README.md)

---

# Context 03 · Context Sources

```bash
npm run context:03
```

Context 不再只理解成聊天历史，而是多个来源：

```text
System Prompt ───────┐
Current Task ────────┤
Session History ─────┼→ Context Builder → Model Context
Project Context ─────┘
```

记成：

```text
03 = Sources
```

详细：[`03-context-sources/README.md`](./03-context-sources/README.md)

---

# Context 04 · History Selection

```bash
npm run context:04
```

第一次引入 Selection Policy：

```text
all
```

和：

```text
recent:N
```

于是：

```text
完整 Session
↓
只选择最近一部分历史
↓
Model Context
```

这一轮解决：

> **选多少？**

记成：

```text
04 = Quantity
```

但学习版实现只是：

```ts
history.slice(-N)
```

它可能把 Tool Call / Tool Result 从中间切断。

详细：[`04-history-selection/README.md`](./04-history-selection/README.md)

---

# Context 05 · Safe Context Units

```bash
npm run context:05
```

核心问题：

> **怎么选历史，才能不把有结构依赖的消息切坏？**

这一轮第一次引入：

```ts
type ContextUnit = {
  messages: SessionMessage[]
}
```

最小规则：

> **一次 user 发起，到下一次 user 发起之前，视为一个完整 Context Unit。**

普通对话：

```text
Unit
├── user
└── assistant
```

Tool 对话：

```text
Unit
├── user
├── assistant(tool_call)
├── tool(result)
└── assistant(final)
```

流程变成：

```text
Session Messages
↓
groupIntoContextUnits()
↓
Context Units
↓
selectRecentUnits()
↓
flattenUnits()
↓
Model Context
```

默认实验会故意对比：

```text
坏方案：slice(-2)
↓
tool(result)
assistant(final)
```

和：

```text
安全方案：recent_units:1
↓
user
assistant(tool_call)
tool(result)
assistant(final)
```

同时做最小校验：

```text
tool(tool_call_id=X)
```

必须在同一个 Unit 前面找到：

```text
assistant(tool_call id=X)
```

否则视为：

```text
orphan tool result
```

这一轮解决：

> **怎么选才不会切坏？**

记成：

```text
05 = Integrity
```

详细：[`05-safe-context-units/README.md`](./05-safe-context-units/README.md)

---

## 五轮连起来

```text
01 Full Session
= 全塞

02 Builder
= 谁负责构建

03 Sources
= Context 从哪里来

04 Selection
= 选多少

05 Safe Units
= 怎么选才不会切坏
```

也可以直接记：

```text
04 = Quantity
05 = Integrity
```

---

## 为什么下一步是 Minimal Context Runtime？

现在已经分别学过：

```text
Sources
Builder
Selection
Safe Units
```

但这些还是散开的概念。

下一轮：

```text
context:06 · Minimal Context Runtime
```

会把它们收成一个最小完整入口：

```text
Context Sources
↓
Context Policy
↓
Safe Unit Selection
↓
Context Builder
↓
Model Context
↓
LLM
```

仍然不进入：

```text
Compaction
摘要
Embedding
RAG
复杂 Token Budget
```

这些留给下一阶段。

---

## 当前 Done 标准

### Context 05

- [ ] 我知道为什么 `slice(-N)` 可能切坏 Agent History。
- [ ] 我能解释 Context Unit。
- [ ] 我知道 Tool Call / Tool Result 不能随便拆开。
- [ ] 我知道 Selection 可以按 Unit，而不是按 Message。
- [ ] 我能解释 `groupIntoContextUnits()` / `selectRecentUnits()` / `flattenUnits()`。
- [ ] 我知道 `04 = Quantity`，`05 = Integrity`。
- [ ] 我知道下一步为什么要收成 Minimal Context Runtime。

做到这些，就进入 **context:06 · Minimal Context Runtime**。
