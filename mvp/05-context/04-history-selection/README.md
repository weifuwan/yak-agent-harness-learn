# Context 04 · History Selection

> 核心问题：**Session 有很多历史，但这一轮到底应该选哪些历史进入 Context？**

前面已经完成：

```text
Context 01
完整 Session 全塞

Context 02
Context Builder 出现

Context 03
Context 有多个 Sources
```

但到目前为止：

```text
Session History
↓
仍然全部进入 Context
```

这一轮第一次引入最小 History Selection Policy。

---

## 运行

```bash
npm run context:04
```

默认构造 20 个历史 Turn：

```text
20 user
+
20 assistant
=
40 条 Session History
```

当前任务始终一样：

```text
请告诉我最近一次出现的 HISTORY 编号
```

然后比较两种策略：

```text
Case A
historySelection = all
↓
40 条历史全部进入 Context
```

以及：

```text
Case B
historySelection = recent:6
↓
只取最近 6 条历史进入 Context
```

重点观察：

```text
session messages
selected history
context messages
prompt_tokens
answer
```

Session 本身没有被删除或修改：

```text
Session = 40 条完整历史
```

变化的只是本轮 Context：

```text
Full Context   = 40 条历史
Recent Context = 6 条历史
```

所以这一轮第一次真正证明：

> **Session 可以完整保存，而 Context 可以选择性消费。**

---

## 最小 Selection Policy

这一轮定义：

```ts
type HistorySelectionPolicy =
  | { type: "all" }
  | { type: "recent"; maxMessages: number }
```

当前最近历史策略非常简单：

```ts
history.slice(-maxMessages)
```

这不是成熟方案。

它只回答一个问题：

> **能不能让 Context Builder 不再无条件消费整个 Session？**

答案是可以。

---

## 为什么不做相关性搜索？

当前还不需要：

```text
Embedding
Vector Search
RAG
Semantic Retrieval
```

先学最简单的：

```text
完整历史
↓
最近 N 条
```

就足够让 Selection Policy 这个概念自然出现。

---

## 当前方案故意有缺陷

`history.slice(-N)` 是按“消息数量”直接切。

但 Agent History 可能包含：

```text
user
assistant(tool_call id=123)
tool(tool_call_id=123)
assistant(final)
```

如果从中间切：

```text
tool(result)
assistant(final)
```

前面的：

```text
assistant(tool_call)
```

可能已经被丢掉。

这样 Model Context 虽然更短，但结构可能已经不完整。

这一轮**不解决这个问题**。

因为它正好引出下一轮：

```text
context:05 · Safe Context Units
```

---

## Done 标准

- [ ] 我知道 Session 可以完整保存，但 Context 不需要完整消费。
- [ ] 我能解释 History Selection Policy。
- [ ] 我能解释 `all / recent` 两种最小策略。
- [ ] 我知道最近 N 条可以明显减少本轮 Context。
- [ ] 我知道 Selection 不等于删除 Session 历史。
- [ ] 我知道 `slice(-N)` 只是学习实现。
- [ ] 我知道直接按消息切，可能破坏 Tool Call / Tool Result 的结构完整性。
- [ ] 我知道下一步为什么需要 Safe Context Units。

做到这些，就进入 **context:05 · Safe Context Units**。
