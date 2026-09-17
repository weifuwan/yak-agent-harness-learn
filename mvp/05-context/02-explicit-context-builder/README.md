# Context 02 · Explicit Context Builder

> 核心问题：**Session 和 Model Context 怎么在代码里真正分开？**

上一轮 `context:01` 直接写：

```ts
const messages = [
  system,
  ...session.messages,
  currentUser,
]
```

也就是：

```text
Session
↓
Runtime 直接拼请求
↓
LLM
```

这一轮第一次引入：

```ts
buildContext()
```

结构变成：

```text
Session
↓
buildContext()
↓
ModelContext
↓
LLM
```

---

## 运行

```bash
npm run context:02
```

仍然对比：

```text
0 个旧 Turn
10 个旧 Turn
30 个旧 Turn
```

当前任务保持完全一致。

你仍然会看到 `prompt_tokens` 随 Session 历史增长。

这是故意的。

因为这一轮：

> **只建立 Context Builder 边界，不做 Context 优化。**

---

## 新增 ModelContext

```ts
type ModelContext = {
  messages: Message[]
}
```

调用方现在先：

```ts
const context = buildContext({
  systemMessage,
  session,
  currentPrompt,
})
```

再：

```ts
callModel(context)
```

LLM 只知道最终 `ModelContext`。

它不需要知道：

```text
Session 怎么持久化
Session 有什么 id
Session 从文件还是数据库加载
```

---

## 为什么行为故意不变？

当前 `buildContext()` 仍然是：

```ts
return {
  messages: [
    system,
    ...session.messages,
    currentUser,
  ],
}
```

也就是说：

```text
Session 全量历史
↓
Context Builder
↓
还是全量历史
```

所以它还没有解决：

```text
历史太长
无关信息太多
Token 成本增长
```

这是刻意保留的问题。

这一轮只证明：

> **保存什么，和发送什么，必须先拥有不同的代码入口。**

---

## 01 和 02 的区别

```text
context:01
Session = Context
```

```text
context:02
Session
↓
Context Builder
↓
Context
```

哪怕输出暂时一样，职责已经分开。

后面的 Context Sources / Selection Policy / Safe Units 都会长在这个 Builder 上，而不是继续堆进 Runtime。

---

## 当前边界

暂时不做：

```text
最近 N 轮
Token Budget
相关性检索
RAG
Embedding
摘要
Compaction
```

这些还没有到。

---

## Done 标准

- [ ] 我能解释为什么 Session 和 Context 需要不同入口。
- [ ] 我能解释 `buildContext()` 的职责。
- [ ] 我能解释 `ModelContext`。
- [ ] 我知道这一轮行为为什么故意和 context:01 一样。
- [ ] 我知道 Context Builder 本身还没有减少 Token。
- [ ] 我知道后续选择策略应该放在 Builder 一侧，而不是 Session 持久化层。

做到这些，就进入 **context:03 · Context Sources**。
