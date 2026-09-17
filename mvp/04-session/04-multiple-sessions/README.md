# Session 04 · Multiple Sessions

> 核心问题：**完整历史已经有了，但同时存在多段会话时，这些历史分别属于谁？**

这一轮只引入两个概念：

```text
sessionId
+
SessionStore
```

暂时不做持久化、数据库、Resume、Context 裁剪。

---

## 1. session:03 的新问题

`session:03` 已经能保存：

```text
user
assistant(tool_call)
tool(result)
assistant(final)
```

但它仍然只有一份 Session。

如果两段不同对话共用同一份历史：

```text
会话 A
+
会话 B
↓
同一个 messages
```

就会发生串话。

---

## 2. 最小 Session Identity

这一轮给 Session 增加：

```ts
type Session = {
  id: string
  messages: SessionMessage[]
}
```

并用：

```ts
type SessionStore = Map<string, Session>
```

保存多份 Session。

最小查找逻辑：

```text
sessionId
↓
getOrCreateSession(store, sessionId)
↓
对应 Session
```

---

## 3. Runtime 怎么变化？

调用入口变成：

```ts
runAgentInSession({
  sessionStore,
  sessionId,
  prompt,
  tools,
  maxSteps,
})
```

Runtime 不再接收一个模糊的全局 Session，而是先根据 `sessionId` 找到对应历史。

```text
session-a
↓
Session A history

session-b
↓
Session B history
```

每个 Run 只读取和更新自己的 Session。

---

## 4. 默认验证场景

运行：

```bash
npm run session:04
```

第一轮：

```text
session-a
记住 AAA-111

session-b
记住 BBB-222
```

第二轮分别追问：

```text
session-a
我的代号是什么？
→ AAA-111

session-b
我的代号是什么？
→ BBB-222
```

程序还会直接检查历史：

```text
session-a contains BBB-222: false
session-b contains AAA-111: false
```

这比只看模型最终回答更可靠，因为它直接验证 Session 数据没有串在一起。

---

## 5. 这一轮真正学到什么？

`session:03` 解决：

```text
Session 里应该存什么？
```

`session:04` 解决：

```text
这份 Session 到底是谁的？
```

可以记成：

```text
03 = History
04 = Identity
```

或者：

> **History 记录发生了什么，Identity 说明这些历史属于哪一段会话。**

---

## 6. 当前仍然没有什么？

现在的 `SessionStore` 仍然只是：

```ts
new Map<string, Session>()
```

所以：

```text
程序运行中
→ 多 Session 都存在

程序退出
→ 整个 Map 消失
```

这不是 bug，而是下一轮要遇到的问题。

`session:05` 才会第一次把 Session 从内存写到持久介质。

---

## Done 标准

- [ ] 我能解释为什么一份全局 Session 会导致串话。
- [ ] 我知道 `sessionId` 是 Session Identity。
- [ ] 我能解释 `Map<string, Session>` 的作用。
- [ ] 我知道 Runtime 为什么必须先通过 sessionId 找到对应 Session。
- [ ] 我能验证 session-a / session-b 的历史互不污染。
- [ ] 我知道当前多 Session 仍然只存在于内存中。
- [ ] 我知道下一步为什么需要 Persist Session。
