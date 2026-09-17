# Context 01 · Full Session As Context

> 核心问题：**Session 已经保存了完整历史，那每次调用 LLM 时直接把全部历史都发过去，行不行？**

这一轮故意采用最直接的做法：

```text
Session.messages
↓
全部复制
↓
Model Context
↓
LLM
```

也就是：

```ts
const requestMessages = [
  system,
  ...session.messages,
  currentUser,
]
```

暂时没有：

```text
Context Builder
历史选择
最近 N 轮
相关性判断
Token Budget
摘要
Compaction
```

---

## 运行

```bash
npm run context:01
```

默认会用同一个当前任务：

```text
请只回复 CONTEXT-01
```

分别构造：

```text
0 个旧 Turn
10 个旧 Turn
30 个旧 Turn
```

每个 Turn 包含：

```text
user
assistant
```

因此三次请求的当前问题完全一样，只有 Session 历史越来越长。

重点观察：

```text
session messages
request messages
prompt_tokens
```

---

## 为什么要构造无关旧历史？

旧历史会包含：

```text
HISTORY-01
HISTORY-02
...
```

这些内容和当前 `CONTEXT-01` 完全无关。

但当前策略仍然会把它们全部重复发送给模型。

所以问题不是：

```text
旧历史能不能保存
```

Session 已经解决这个问题。

真正的问题是：

```text
旧历史是否应该在这一轮进入模型上下文
```

这是 Context 的问题。

---

## Session 和 Context 第一次真正分开

可以先记成：

```text
Session
= 完整保存发生过什么

Context
= 这一次真正发给模型什么
```

`context:01` 里我们故意让：

```text
Session = Context
```

所以随着 Session 增长：

```text
旧历史越来越多
↓
每次请求重复携带更多内容
↓
request messages 增长
↓
prompt token 成本增长
```

而且里面可能有很多与当前任务毫无关系的信息。

---

## 和 llm:05 有什么区别？

`llm:05` 学的是：

> 多轮对话需要重新发送历史，因此历史会消耗 Context Window。

`context:01` 学的是更上层的问题：

> 既然 Session 已经保存了全部历史，Runtime 是否应该无条件把全部 Session 当作本轮 Context？

答案先不要抽象成复杂方案。

这一轮只看到问题。

---

## 当前边界

这一轮没有 Tool，也没有 Session 持久化流程的演示。

因为这些已经在前面的章节学过。

这里只聚焦：

```text
Full Session
↓
Full Model Context
```

带来的冗余。

---

## Done 标准

- [ ] 我能区分 Session 和 Model Context。
- [ ] 我知道 `context:01` 故意让完整 Session 直接进入请求。
- [ ] 我知道当前任务不变时，旧历史越多，请求仍然会越来越大。
- [ ] 我能解释为什么很多持久化历史对当前任务可能没有价值。
- [ ] 我知道 Session 负责保存，不应该顺便决定本轮模型看到什么。
- [ ] 我知道下一步为什么需要一个显式 Context Builder。

做到这些，就进入 **context:02 · Explicit Context Builder**。
