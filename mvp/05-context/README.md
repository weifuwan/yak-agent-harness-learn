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
01 Full Session As Context   ← 当前
02 Explicit Context Builder  ← 后续
03 Context Sources           ← 后续
04 History Selection         ← 后续
05 Safe Context Units        ← 后续
06 Minimal Context Runtime   ← 后续
```

---

## Session 和 Context 的边界

Session 已经解决：

```text
完整保存发生过什么
↓
user
assistant(tool_call)
tool(result)
assistant
...
```

但这不代表每次 LLM Request 都应该：

```text
system
+
全部 Session 历史
+
当前 user
```

所以 Context 要解决的是：

> **这一次调用模型，真正应该放哪些信息进去？**

先记住：

```text
Session
= 完整事实历史

Context
= 本轮实际发送给模型的信息
```

---

# Context 01 · Full Session As Context

核心问题：**直接把完整 Session 当作 Model Context，会发生什么？**

运行：

```bash
npm run context:01
```

默认使用完全相同的当前任务：

```text
请只回复 CONTEXT-01
```

分别构造：

```text
0 个旧 Turn
10 个旧 Turn
30 个旧 Turn
```

当前策略故意没有任何 Context 设计：

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

旧 Session 中的 `HISTORY-*` 内容和当前任务完全无关，但仍然会被重复发送。

这一轮要看到的是：

> **Session 负责“保存”，但不应该顺便决定“本轮模型看到什么”。**

详细说明：[`01-full-session-as-context/README.md`](./01-full-session-as-context/README.md)

---

## 和 llm:05 的区别

`llm:05` 解决认知：

```text
历史 messages 会占用 Context Window
```

`context:01` 再往上一层：

```text
既然历史都保存在 Session
↓
Runtime 是否应该无条件全部发送？
```

当前答案仍然故意是：

```text
全部发送
```

因为这一轮需要先把问题看清楚。

---

## 为什么下一步是 Explicit Context Builder？

现在代码直接写：

```text
Session.messages
↓
LLM Request
```

中间没有任何独立决策层。

所以下一步进入：

```text
context:02 · Explicit Context Builder
```

第一次把流程改成：

```text
Session
↓
Context Builder
↓
Model Context
↓
LLM
```

注意：`context:02` 的重点先是**把边界建立起来**，还不会马上做复杂的智能选择。

暂时不进入：

```text
RAG
Embedding
摘要
Compaction
复杂 Token Budget
```

---

## 当前 Done 标准

### Context 01

- [ ] 我能区分 Session 和 Context。
- [ ] 我知道完整 Session 可以保存，但不一定应该全部进入每次 LLM Request。
- [ ] 我知道当前任务相同时，旧历史越多，请求仍然会越来越大。
- [ ] 我能解释为什么无关历史也是 Context 噪音。
- [ ] 我知道 Context 是“本轮输入选择”问题，不是 Session 持久化问题。
- [ ] 我知道下一步为什么需要显式 Context Builder。

做到这些，就进入 **context:02 · Explicit Context Builder**。
