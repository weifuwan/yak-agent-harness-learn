# Context 05 · Safe Context Units

> 核心问题：**History Selection 已经会“选少一点”，但怎么保证不会把一组有依赖关系的消息切坏？**

运行：

```bash
npm run context:05
```

---

## 先看 context:04 留下的问题

上一轮最小策略是：

```ts
history.slice(-N)
```

它只知道消息数量，不知道消息之间是否存在结构依赖。

真实 Agent History 可能是：

```text
user
assistant(tool_call id=call-0501)
tool(tool_call_id=call-0501)
assistant(final)
```

如果直接：

```ts
history.slice(-2)
```

会得到：

```text
tool(result)
assistant(final)
```

对应的：

```text
assistant(tool_call)
```

已经丢失。

所以 Context 虽然变短了，但结构坏了。

---

## 这一轮引入 Context Unit

最小定义：

```ts
type ContextUnit = {
  messages: SessionMessage[]
}
```

当前学习版规则很简单：

> **一次 user 发起，到下一次 user 发起之前，属于同一个 Context Unit。**

普通对话：

```text
Unit 1
├── user
└── assistant
```

带 Tool 的一轮：

```text
Unit 2
├── user
├── assistant(tool_call)
├── tool(result)
└── assistant(final)
```

于是 Selection 不再：

```text
按 Message 数量切
```

而是：

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

---

## 默认实验

Session 一共有 3 个 Unit：

```text
Unit 1
user → assistant

Unit 2
user → assistant

Unit 3
user
→ assistant(tool_call:call-context-0501)
→ tool(result:call-context-0501)
→ assistant(final)
```

先故意执行坏方案：

```ts
sessionHistory.slice(-2)
```

得到：

```text
tool(result)
→ assistant(final)
```

再执行安全方案：

```ts
recent_units: 1
```

得到完整最后一组：

```text
user
→ assistant(tool_call)
→ tool(result)
→ assistant(final)
```

然后把这一个完整 Unit 交给模型，并询问最近一次工具真正返回的值。

---

## 为什么要校验 Tool Result？

学习版 `groupIntoContextUnits()` 会做一个最小结构校验：

```text
tool(tool_call_id=X)
```

必须能在同一个 Unit 前面找到：

```text
assistant(tool_call id=X)
```

否则认为它是：

```text
orphan tool result
```

这不是为了构建完整生产级协议校验器。

只是为了证明：

> **History Selection 不能只理解数量，还需要理解消息结构。**

---

## 04 和 05 的区别

```text
context:04
选多少？
↓
Quantity
```

```text
context:05
怎么选才不会切坏？
↓
Integrity
```

记住：

> **Context Selection 的最小单位，不一定是一条 Message。**

---

## 这一轮暂时不做

仍然不进入：

```text
Token Budget
Compaction
摘要
RAG
Embedding
复杂相关性选择
```

`Context Unit` 也只是学习版最小规则，不代表生产系统只能按 user turn 分组。

下一轮 `context:06` 会把：

```text
Sources
Selection
Safe Units
Builder
```

收进一个最小 Context Runtime。

---

## Done 标准

- [ ] 我知道为什么 `slice(-N)` 可能切坏 Agent History。
- [ ] 我能解释 Context Unit 是什么。
- [ ] 我知道 Tool Call / Tool Result 不能随便拆开。
- [ ] 我知道 Selection 可以按 Unit，而不是按单条 Message。
- [ ] 我能解释 `groupIntoContextUnits()` / `selectRecentUnits()` / `flattenUnits()` 各自负责什么。
- [ ] 我知道 `04 = Quantity`，`05 = Integrity`。
- [ ] 我知道下一步为什么要收成 Minimal Context Runtime。
