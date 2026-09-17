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
03 Context Sources           ✅
04 History Selection         ← 当前
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

这一轮最重要的认识：

> **Context 不等于聊天历史，而是完成本轮任务所需要的多种信息源的组合。**

Session 只是其中一个 Source。

可以记成：

```text
03 = Sources
```

详细说明：[`03-context-sources/README.md`](./03-context-sources/README.md)

---

# Context 04 · History Selection

核心问题：**Session History 很长以后，这一轮到底应该选择哪些历史进入 Context？**

这一轮第一次引入最小 Selection Policy：

```ts
type HistorySelectionPolicy =
  | { type: "all" }
  | { type: "recent"; maxMessages: number }
```

运行：

```bash
npm run context:04
```

默认 Session 构造：

```text
20 个历史 Turn
=
40 条历史消息
```

当前任务始终一样：

```text
请告诉我最近一次出现的 HISTORY 编号
```

对比两种策略：

```text
Case A
all
↓
40 条 Session History 全部进入 Context
```

以及：

```text
Case B
recent:6
↓
只有最近 6 条 Session History 进入 Context
```

重点观察：

```text
session messages
selected history
context messages
prompt_tokens
answer
```

Session 本身仍然完整保存 40 条消息。

变化的只是：

```text
本轮 Context 消费多少历史
```

所以这一轮第一次真正建立：

> **Session 可以完整保存，而 Context 可以选择性消费。**

可以记成：

```text
04 = Selection
```

详细说明：[`04-history-selection/README.md`](./04-history-selection/README.md)

---

## 四轮先连起来

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

context:04
History Selection Policy
↓
Session 完整保存，但 Context 选择性消费
```

也就是：

```text
01 = Full Session
02 = Builder
03 = Sources
04 = Selection
```

---

## 当前 Selection 的缺陷

当前最近历史策略只是：

```ts
history.slice(-N)
```

它按“消息数量”直接切。

但真实 Agent History 可能包含：

```text
user
assistant(tool_call id=123)
tool(tool_call_id=123)
assistant(final)
```

如果刚好从中间切：

```text
tool(result)
assistant(final)
```

前面的：

```text
assistant(tool_call)
```

可能已经丢了。

于是 Context 虽然变短，但结构已经不完整。

这个问题这一轮故意不解决。

---

## 为什么下一步是 Safe Context Units？

现在已经会：

```text
完整 Session
↓
选择最近 N 条
↓
Model Context
```

新的问题是：

> **历史到底应该按“消息”切，还是按某种完整逻辑单元切？**

所以下一轮进入：

```text
context:05 · Safe Context Units
```

专门解决 Tool Call / Tool Result、User Turn 等结构如何成组保留。

暂时仍然不进入：

```text
Compaction
摘要
Embedding
RAG
复杂 Token Budget
```

---

## 当前 Done 标准

### Context 01

- [ ] 我能区分 Session 和 Context。
- [ ] 我知道完整 Session 不应该天然等于本轮 Context。

### Context 02

- [ ] 我能解释 `buildContext()` 为什么存在。
- [ ] 我知道 Builder 是“发送什么”的独立入口。

### Context 03

- [ ] 我知道 Context 可以来自多个 Sources。
- [ ] 我知道 Session History 只是其中一个 Source。

### Context 04

- [ ] 我能解释 History Selection Policy。
- [ ] 我能区分 `all / recent`。
- [ ] 我知道 Selection 不等于删除 Session History。
- [ ] 我知道 Session 可以完整保存，而 Context 只消费一部分。
- [ ] 我知道最近 N 条可以减少本轮 Context 和 prompt token 消耗。
- [ ] 我知道 `history.slice(-N)` 只是最小学习实现。
- [ ] 我知道直接按消息切可能破坏 Tool Call / Tool Result 的结构完整性。
- [ ] 我知道下一步为什么需要 Safe Context Units。

做到这些，就进入 **context:05 · Safe Context Units**。
