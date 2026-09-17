# Context 06 · Minimal Context Runtime

> 核心问题：**前面学到的 Context 能力，怎么收成一个 Agent Runtime 可以稳定调用的入口？**

运行：

```bash
npm run context:06
```

---

## 这一轮不增加新概念

前面已经分别解决：

```text
01 Full Session
02 Builder
03 Sources
04 Selection
05 Safe Units
```

现在只做一件事：

> **把这些能力收进一个最小 Context Runtime。**

---

## 对外只暴露一个入口

```ts
const context = prepareContext({
  systemPrompt,
  currentTask,
  session,
  projectContext,
  policy: {
    history: {
      type: "recent_units",
      maxUnits: 2,
    },
  },
})
```

调用方不需要再自己执行：

```text
groupIntoContextUnits()
validate tool pairs
selectRecentUnits()
flattenUnits()
拼 system / project / history / current task
```

这些都收进 `prepareContext()` 内部。

---

## Runtime 边界

```text
System Prompt ───────┐
Current Task ────────┤
Session ─────────────┼→ prepareContext() → ModelContext → LLM
Project Context ─────┤
Context Policy ──────┘
```

职责变成：

```text
Session
= 完整保存发生过什么

Context Runtime
= 决定这一轮模型实际看到什么

Agent Runtime
= 控制 Agent 如何运行

LLM
= 消费最终 ModelContext
```

---

## 默认实验

Session 中有 3 个完整 Unit：

```text
Unit 1
user
assistant

Unit 2
user
assistant(tool_call)
tool(result = TOOL-VALUE-0601)
assistant(final)

Unit 3
user
assistant
```

Policy：

```text
recent_units:2
```

所以本轮只选择：

```text
Unit 2
+
Unit 3
```

但 Unit 2 会完整保留：

```text
user
assistant(tool_call)
tool(result)
assistant(final)
```

同时 Project Context 提供：

```text
runtime = Node >=22
language = TypeScript
runner = tsx
```

当前 Task 要模型同时回答：

```text
runtime=<值>; tool=<最近工具返回值>
```

这个实验同时验证：

```text
Sources
+
Selection
+
Safe Units
+
Builder
```

已经可以被一个 Runtime 统一调用。

---

## 最终结构

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
├── messages
└── stats
        ↓
LLM
```

`stats` 只用于观察：

```text
totalHistoryMessages
totalUnits
selectedHistoryMessages
selectedUnits
hasProjectContext
historyPolicy
```

---

## Context 六轮总结

```text
01 = Problem
02 = Builder
03 = Sources
04 = Quantity
05 = Integrity
06 = Runtime
```

最重要的边界：

> **Session 是完整事实历史；Context Runtime 是本轮模型输入的准备层。**

---

## 这一轮仍然故意不做什么？

不做：

```text
Token Budget
摘要
Compaction
Embedding
RAG
语义相关性检索
```

因为新的问题已经自然出现：

> **即使只选了必要的完整 Context Units，它们本身还是太长怎么办？**

这就是下一阶段：

```text
06 · Compaction
```
