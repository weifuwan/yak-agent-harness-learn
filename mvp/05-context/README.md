# 05 · Context 学习

> 核心问题：**Session 保存了全部历史，但这一轮模型到底应该看到什么？**

当前原则：**先让问题暴露，再让 Context Builder、Sources、Selection 一层层自然长出来。**

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
03 Context Sources           ← 当前
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

这一轮要看到：

> **Session 负责保存，但不应该顺便决定本轮模型看到什么。**

可以记成：

```text
01 = Full Session
```

详细说明：[`01-full-session-as-context/README.md`](./01-full-session-as-context/README.md)

---

# Context 02 · Explicit Context Builder

核心问题：**Session 和 Model Context 怎么在代码里真正分开？**

第一次引入：

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

这一轮行为故意不变：`buildContext()` 仍然全量返回 Session。

所以它没有解决 Token 增长，只解决了职责边界：

> **保存什么，和发送什么，先拥有不同的代码入口。**

可以记成：

```text
02 = Builder
```

详细说明：[`02-explicit-context-builder/README.md`](./02-explicit-context-builder/README.md)

---

# Context 03 · Context Sources

核心问题：**Context Builder 除了 Session History，还应该从哪里获得信息？**

这一轮第一次明确多个来源：

```ts
type ContextSources = {
  systemPrompt: string
  currentTask: string
  sessionHistory: Message[]
  projectContext?: string
}
```

结构变成：

```text
System Prompt ───────┐
Current Task ────────┤
Session History ─────┼→ Context Builder → Model Context → LLM
Project Context ─────┘
```

运行：

```bash
npm run context:03
```

默认问题完全相同：

```text
这个项目使用什么运行时、语言和 TypeScript 执行器？
```

先只提供：

```text
System
Session History
Current Task
```

Session History 里只有之前关于 Session / Agent Loop 的讨论，没有项目技术栈事实。

再加入：

```text
Project Context
- Node >=22
- TypeScript 5.9
- tsx 4.20
```

当前 Task 没变，变化的只有 Context Source。

这一轮最重要的认识：

> **Context 不等于聊天历史，而是完成本轮任务所需要的多种信息源的组合。**

Session 只是其中一个 Source。

可以记成：

```text
03 = Sources
```

详细说明：[`03-context-sources/README.md`](./03-context-sources/README.md)

---

## 三轮先连起来

```text
context:01
Session 全部直接进入 LLM
↓
发现保存历史 ≠ 合理输入

context:02
加入 Context Builder
↓
让“本轮输入”有独立构建入口

context:03
Context Builder 接收多个 Sources
↓
Context 不再等于 Session History
```

也就是：

```text
01 = Full Session
02 = Builder
03 = Sources
```

---

## 为什么下一步是 History Selection？

现在已经知道 Context 可以来自：

```text
System
Current Task
Session History
Project Context
```

但 `sessionHistory` 当前仍然是：

```text
有多少
↓
全部进入 Context
```

如果 Session 有 100 条、1000 条历史，问题仍然存在。

所以下一轮进入：

```text
context:04 · History Selection
```

第一次回答：

> **完整 Session History 中，这一轮到底应该选择哪些历史？**

最小方案先从最简单的 `recent N` 开始，不提前引入 RAG、Embedding、摘要或 Compaction。

---

## 当前 Done 标准

### Context 01

- [ ] 我能区分 Session 和 Context。
- [ ] 我知道完整 Session 不应该天然等于本轮 Context。

### Context 02

- [ ] 我能解释 `buildContext()` 为什么存在。
- [ ] 我知道 Builder 是“发送什么”的独立入口。
- [ ] 我知道这一轮为什么没有减少 Token。

### Context 03

- [ ] 我知道 Context 不等于 Session History。
- [ ] 我能区分 System Prompt / Current Task / Session History / Project Context。
- [ ] 我知道 Session 只是 Context 的一个 Source。
- [ ] 我知道 Context Builder 可以组合多个不同来源。
- [ ] 我知道这一轮仍然没有 History Selection。
- [ ] 我知道下一步为什么要开始选择历史。

做到这些，就进入 **context:04 · History Selection**。
