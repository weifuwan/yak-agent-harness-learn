# 04 · Session 学习

> 核心问题：**一次 `runAgent()` 结束以后，下一次 Run 怎么知道之前发生了什么？**

当前原则：**先看到跨 Run 历史丢失，再让 Session 自然长出来。**

当前状态：`LEARNING`

---

## 学习路线

```text
01 No Session
   ↓
02 In-Memory Session
   ↓
03 Full Session History
   ↓
04 Multiple Sessions
   ↓
05 Persist Session
   ↓
06 Resume Session
```

当前进度：

```text
01 No Session            ✅
02 In-Memory Session     ✅
03 Full Session History  ✅
04 Multiple Sessions     ← 当前
05 Persist Session       ← 后续
06 Resume Session        ← 后续
```

---

## Session 和 Agent Loop 的边界

Agent Loop 解决：

```text
一次 runAgent()
↓
LLM
↓
Tool
↓
LLM
↓
...
↓
完成
```

Session 解决：

```text
Run #1
↓
历史留下
↓
Run #2
↓
继续使用上一轮历史
```

所以：

> **Agent Loop 管一次 Run；Session 管多个 Run 之间的连续历史。**

---

# Session 01 · No Session

核心问题：**两个 `runAgent()` 会自动共享历史吗？**

```bash
npm run session:01
```

结论：

```text
Run #1 完成
↓
内部 messages 消失
↓
Run #2 全新开始
```

详细说明：[`01-no-session/README.md`](./01-no-session/README.md)

---

# Session 02 · In-Memory Session

核心问题：**两个 Agent Run 怎么先在同一个进程里共享历史？**

第一次定义：

```ts
type Session = {
  messages: SessionMessage[]
}
```

运行：

```bash
npm run session:02
```

这一轮证明：

> **模型并没有自己记住，而是应用保存历史，再在下一次 Run 时重新传给模型。**

但这一轮只保存：

```text
user
assistant(final)
```

详细说明：[`02-in-memory-session/README.md`](./02-in-memory-session/README.md)

---

# Session 03 · Full Session History

核心问题：**只保存聊天最终文本，真的等于保存了 Agent 完整历史吗？**

这一轮把 Session Message 扩展为：

```text
user
assistant(tool_call)
tool(result)
assistant(final)
```

运行：

```bash
npm run session:03
```

所以这一轮开始：

> **Session 不再只是聊天记录，而是 Agent 真正发生过的事实历史。**

可以记成：

```text
02 = 记住对话
03 = 记住真正发生过什么
```

详细说明：[`03-full-session-history/README.md`](./03-full-session-history/README.md)

---

# Session 04 · Multiple Sessions

核心问题：**已经有完整历史以后，多段不同会话怎么避免串线？**

这一轮第一次给 Session 增加 Identity：

```ts
type Session = {
  id: string
  messages: SessionMessage[]
}
```

并引入最小内存 Store：

```ts
type SessionStore = Map<string, Session>
```

Runtime 入口现在会显式接收：

```ts
runAgentInSession({
  sessionStore,
  sessionId,
  prompt,
  tools,
  maxSteps,
})
```

内部流程：

```text
sessionId
↓
getOrCreateSession()
↓
只读取这一份 Session.history
↓
运行 Agent
↓
只更新这一份 Session.history
```

运行：

```bash
npm run session:04
```

默认场景：

```text
session-a
→ 记住 AAA-111

session-b
→ 记住 BBB-222
```

随后分别追问：

```text
session-a
→ AAA-111

session-b
→ BBB-222
```

程序还会直接检查历史：

```text
session-a contains BBB-222: false
session-b contains AAA-111: false
```

这一轮最重要的认识：

```text
03 = History
04 = Identity
```

也就是：

> **History 记录发生了什么，Identity 说明这些历史属于哪一个 Session。**

详细说明：[`04-multiple-sessions/README.md`](./04-multiple-sessions/README.md)

---

## 为什么下一步是 Persist Session？

现在同一个进程里已经可以维护：

```text
session-a
session-b
session-c
...
```

而且它们互不污染。

但 `SessionStore` 仍然只是：

```ts
new Map<string, Session>()
```

所以：

```text
程序运行中
→ Session 都还在

程序退出
→ 整个 Store 消失
```

下一轮进入：

```text
session:05 · Persist Session
```

解决：

> **这些带有 sessionId 的完整历史，怎么从内存真正保存到磁盘？**

暂时仍然不做数据库、Context 裁剪、Compaction。

---

## 当前 Done 标准

### Session 01

- [ ] 我知道为什么两个 `runAgent()` 默认互相隔离。

### Session 02

- [ ] 我能解释 `Session.messages`。
- [ ] 我知道模型不是自己记住历史。

### Session 03

- [ ] 我知道为什么 Tool Call / Tool Result 也属于 Session 历史。
- [ ] 我知道 Session 表示完整事实历史。

### Session 04

- [ ] 我能解释为什么一份全局 Session 会导致串话。
- [ ] 我知道 `sessionId` 是 Session Identity。
- [ ] 我能解释 `Map<string, Session>` 的作用。
- [ ] 我知道 Runtime 为什么必须先通过 sessionId 找到对应 Session。
- [ ] 我能验证 session-a / session-b 的历史互不污染。
- [ ] 我知道当前多个 Session 仍然只存在于内存。
- [ ] 我知道下一步为什么需要 Persist Session。

做到这些，就进入 **session:05 · Persist Session**。
