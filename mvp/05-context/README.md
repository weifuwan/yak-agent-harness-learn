# 05 · Context 学习

> 核心问题：**Session 保存了全部历史，但这一轮模型到底应该看到什么？**

当前原则：**先让完整 Session 全部进入请求，亲眼看到问题，再让 Context Builder 自然长出来。**

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
02 Explicit Context Builder  ← 当前
03 Context Sources           ← 后续
04 History Selection         ← 后续
05 Safe Context Units        ← 后续
06 Minimal Context Runtime   ← 后续
```

---

## Session 和 Context 的边界

```text
Session
= 完整事实历史

Context
= 本轮实际发送给模型的信息
```

Session 可以长期保存：

```text
user
assistant(tool_call)
tool(result)
assistant
...
```

但这不代表每次 LLM Request 都应该把全部历史重新发送。

---

# Context 01 · Full Session As Context

核心问题：**直接把完整 Session 当作 Model Context，会发生什么？**

运行：

```bash
npm run context:01
```

默认对比：

```text
0 个旧 Turn
10 个旧 Turn
30 个旧 Turn
```

当前任务完全相同，变化的只有旧 Session 历史数量。

策略故意写成：

```ts
const requestMessages = [
  system,
  ...session.messages,
  currentUser,
]
```

所以：

```text
Session 有多少
↓
Context 就塞多少
```

重点观察：

```text
session messages
request messages
prompt_tokens
```

这一轮得出的核心问题是：

> **Session 负责保存，但不应该顺便决定本轮模型看到什么。**

详细说明：[`01-full-session-as-context/README.md`](./01-full-session-as-context/README.md)

---

# Context 02 · Explicit Context Builder

核心问题：**Session 和 Model Context 怎么在代码里真正分开？**

这一轮第一次引入：

```ts
buildContext()
```

结构从：

```text
Session
↓
Runtime 直接拼 messages
↓
LLM
```

变成：

```text
Session
↓
buildContext()
↓
ModelContext
↓
LLM
```

运行：

```bash
npm run context:02
```

新增最小类型：

```ts
type ModelContext = {
  messages: Message[]
}
```

调用流程：

```ts
const context = buildContext({
  systemMessage,
  session,
  currentPrompt,
})

await callModel(context)
```

## 为什么行为故意不变？

当前 `buildContext()` 仍然全量返回 Session：

```text
system
+
全部 session.messages
+
current user
```

所以 `0 / 10 / 30` 个旧 Turn 的 `prompt_tokens` 仍然会增长。

这是刻意的。

这一轮只解决：

> **保存什么，和发送什么，先拥有不同的代码入口。**

还没有解决：

```text
哪些历史值得选
Token Budget
相关性
历史裁剪
摘要
Compaction
```

可以记成：

```text
context:01
Session = Context

context:02
Session
↓
Context Builder
↓
Context
```

详细说明：[`02-explicit-context-builder/README.md`](./02-explicit-context-builder/README.md)

---

## 为什么下一步是 Context Sources？

现在已经有一个独立入口：

```ts
buildContext(...)
```

新的问题变成：

> **Context 除了 Session History，还可能由哪些信息组成？**

例如 Coding Agent 可能需要：

```text
System Prompt
Current Task
Session History
Project Information
Tool Result
Working Directory
```

所以下一轮进入：

```text
context:03 · Context Sources
```

先把不同信息源拆清楚，再谈如何选择历史。

---

## 当前 Done 标准

### Context 01

- [ ] 我能区分 Session 和 Context。
- [ ] 我知道完整 Session 不应该天然等于本轮 Context。
- [ ] 我知道无关旧历史也会占用请求 Token。

### Context 02

- [ ] 我能解释 `buildContext()` 为什么存在。
- [ ] 我能解释 `ModelContext`。
- [ ] 我知道 LLM 现在只消费最终 Context，不需要知道 Session 如何保存。
- [ ] 我知道这一轮为什么没有减少 Token。
- [ ] 我知道 Builder 当前仍然全量返回 Session。
- [ ] 我知道后续 Context 逻辑应该长在 Builder 一侧，而不是 Session 持久化层。
- [ ] 我知道下一步为什么要研究 Context Sources。

做到这些，就进入 **context:03 · Context Sources**。
