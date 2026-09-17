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
04 Multiple Sessions     ✅
05 Persist Session       ← 当前
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

```bash
npm run session:02
```

这一轮证明：

> **模型并没有自己记住，而是应用保存历史，再在下一次 Run 时重新传给模型。**

可以记成：

```text
02 = Memory
```

详细说明：[`02-in-memory-session/README.md`](./02-in-memory-session/README.md)

---

# Session 03 · Full Session History

核心问题：**只保存聊天最终文本，真的等于保存了 Agent 完整历史吗？**

Session 扩展为完整事实历史：

```text
user
assistant(tool_call)
tool(result)
assistant(final)
```

```bash
npm run session:03
```

从这一轮开始：

> **Session 不再只是聊天记录，而是 Agent 真正发生过的事实历史。**

可以记成：

```text
03 = History
```

详细说明：[`03-full-session-history/README.md`](./03-full-session-history/README.md)

---

# Session 04 · Multiple Sessions

核心问题：**已经有完整历史以后，多段不同会话怎么避免串线？**

第一次给 Session 增加 Identity：

```ts
type Session = {
  id: string
  messages: SessionMessage[]
}
```

并引入：

```ts
type SessionStore = Map<string, Session>
```

Runtime 通过：

```text
sessionId
↓
getOrCreateSession()
↓
只读取这一份历史
↓
只更新这一份历史
```

```bash
npm run session:04
```

默认会验证：

```text
session-a → AAA-111
session-b → BBB-222
```

两份历史互不污染。

可以记成：

```text
04 = Identity
```

详细说明：[`04-multiple-sessions/README.md`](./04-multiple-sessions/README.md)

---

# Session 05 · Persist Session

核心问题：**带有 sessionId 的完整历史，程序退出以后怎么留下？**

`session:04` 的 Store 只是：

```ts
new Map<string, Session>()
```

进程结束以后全部消失。

这一轮第一次引入最小文件持久化：

```text
Session
↓
saveSession()
↓
JSON
↓
.sessions/session-a.json
```

以及反向过程：

```text
.sessions/session-a.json
↓
loadSession()
↓
Session
↓
new Map()
```

运行：

```bash
npm run session:05
```

默认场景会先运行一个真实 Agent Run，并保存完整历史：

```text
user
assistant(tool_call)
tool(result)
assistant(final)
```

随后模拟新进程：

```text
Process #2 Store = new Map()
↓
size = 0
↓
loadSession("session-a")
↓
size = 1
```

并验证保存前、加载后的 Tool Result 完全一致。

这一轮最重要的边界：

```text
session:05
= Persistence
= 历史能保存 / 能加载
```

但是加载回来以后，还没有继续执行 Agent。

所以：

```text
04 = Identity
05 = Persistence
06 = Resume
```

详细说明：[`05-persist-session/README.md`](./05-persist-session/README.md)

---

## 为什么下一步是 Resume Session？

现在已经可以：

```text
Run #1
↓
Session
↓
saveSession()
↓
程序结束

新进程
↓
loadSession()
↓
历史重新出现
```

但是新的问题是：

> **历史加载回来以后，怎么把它重新接到 Agent Runtime 上，继续下一轮对话？**

下一轮进入：

```text
session:06 · Resume Session
```

目标会是：

```text
loadSession(sessionId)
↓
恢复 Session
↓
用户继续输入
↓
Agent 基于旧历史继续运行
↓
再次保存
```

这一轮暂时不进入 Context 裁剪、Compaction、数据库或复杂存储工程。

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

- [ ] 我知道 `sessionId` 是 Session Identity。
- [ ] 我能解释 `Map<string, Session>`。
- [ ] 我知道多个 Session 为什么必须隔离。

### Session 05

- [ ] 我知道内存 Store 为什么不能跨进程存在。
- [ ] 我能解释 `saveSession()`。
- [ ] 我能解释 `loadSession()`。
- [ ] 我知道保存的是完整 Session，而不是聊天摘要。
- [ ] 我知道新进程的 Store 可以从 JSON 重新构建。
- [ ] 我能区分 Persistence 和 Resume。
- [ ] 我知道下一步为什么需要 Resume Session。

做到这些，就进入 **session:06 · Resume Session**。
