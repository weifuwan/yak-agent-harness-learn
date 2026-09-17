# 05 · Context 学习

> 核心问题：**Session 保存了全部历史，但这一轮模型到底应该看到什么？**

状态：`COMPLETE`

核心边界：

```text
Session
= 完整事实历史

Context
= 本轮实际发送给模型的信息
```

所以：

> **完整保存，不等于全部发送。**

---

## 学习路线

```text
01 Full Session As Context   ✅
02 Explicit Context Builder  ✅
03 Context Sources           ✅
04 History Selection         ✅
05 Safe Context Units        ✅
06 Minimal Context Runtime   ✅
```

---

# 01 · Full Session As Context

运行：

```bash
npm run context:01
```

故意让：

```text
Session 有多少历史
↓
Context 就塞多少
```

先看到问题：

> **Session 负责保存，但不应该顺便决定模型本轮看到什么。**

记成：

```text
01 = Problem
```

详细：[`01-full-session-as-context/README.md`](./01-full-session-as-context/README.md)

---

# 02 · Explicit Context Builder

运行：

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

行为先不优化，只建立职责边界。

记成：

```text
02 = Builder
```

详细：[`02-explicit-context-builder/README.md`](./02-explicit-context-builder/README.md)

---

# 03 · Context Sources

运行：

```bash
npm run context:03
```

Context 不只是聊天历史，而是多个来源：

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

# 04 · History Selection

运行：

```bash
npm run context:04
```

第一次引入 History Selection：

```text
完整 Session
↓
all / recent:N
↓
Model Context
```

这一轮解决：

> **选多少？**

记成：

```text
04 = Quantity
```

学习版故意使用 `slice(-N)`，留下“可能切坏 Tool 历史”的问题。

详细：[`04-history-selection/README.md`](./04-history-selection/README.md)

---

# 05 · Safe Context Units

运行：

```bash
npm run context:05
```

历史不再按单条 Message 生硬裁剪，而是按完整 Context Unit 选择：

```text
普通 Unit
user
assistant
```

```text
Tool Unit
user
assistant(tool_call)
tool(result)
assistant(final)
```

流程：

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

这一轮解决：

> **怎么选才不会切坏？**

记成：

```text
05 = Integrity
```

详细：[`05-safe-context-units/README.md`](./05-safe-context-units/README.md)

---

# 06 · Minimal Context Runtime

运行：

```bash
npm run context:06
```

这一轮不再增加新概念，而是把前面的能力收成一个稳定入口：

```ts
const context = prepareContext({
  systemPrompt,
  currentTask,
  session,
  projectContext,
  policy,
})
```

内部负责：

```text
Sources
↓
Safe Unit Grouping
↓
History Selection
↓
Context Assembly
↓
ModelContext
```

调用方不需要再知道：

```text
怎么分 Unit
怎么校验 Tool Call / Tool Result
怎么选最近历史
怎么 flatten
怎么拼最终 messages
```

边界最终变成：

```text
Session
+ Current Task
+ System Prompt
+ Project Context
+ Context Policy
        ↓
prepareContext()
        ↓
ModelContext
        ↓
LLM
```

记成：

```text
06 = Runtime
```

详细：[`06-minimal-context-runtime/README.md`](./06-minimal-context-runtime/README.md)

---

## 六轮总结

```text
01 = Problem
02 = Builder
03 = Sources
04 = Quantity
05 = Integrity
06 = Runtime
```

完整演进：

```text
Session 全塞
↓
Context Builder
↓
Multiple Sources
↓
History Selection
↓
Safe Context Units
↓
Minimal Context Runtime
```

最终最重要的一句话：

> **Session 是事实源；Context Runtime 决定这一轮模型实际看到什么。**

---

## Context Runtime 当前明确不解决什么？

仍然没有：

```text
Token Budget
摘要
Compaction
Embedding
RAG
语义相关性检索
```

因为即使已经：

```text
只选择必要的 Context Units
+
保证结构完整
```

仍然可能出现：

> **这些必须保留的 Context 本身就已经太长。**

所以 Context 到这里封板。

下一阶段：

```text
06 · Compaction
```

核心问题：

> **该保留的信息已经太长时，怎么压缩而不丢掉继续执行任务所需的关键状态？**
