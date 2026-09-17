# 04 · Session 学习

> 核心问题：**一次 `runAgent()` 结束以后，下一次 Run 怎么知道之前发生了什么？**

当前原则：**先看到跨 Run 历史丢失，再让 Session 自然长出来。**

当前状态：`COMPLETE`

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
05 Persist Session       ✅
06 Resume Session        ✅
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

所以：

```text
01 = No Memory Across Runs
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

所以：

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

运行：

```bash
npm run session:03
```

从这一轮开始：

> **Session 不再只是聊天记录，而是 Agent 真正发生过的事实历史。**

所以：

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

运行：

```bash
npm run session:04
```

所以：

```text
04 = Identity
```

详细说明：[`04-multiple-sessions/README.md`](./04-multiple-sessions/README.md)

---

# Session 05 · Persist Session

核心问题：**带有 sessionId 的完整历史，程序退出以后怎么留下？**

最小文件持久化：

```text
Session
↓
saveSession()
↓
JSON
↓
.sessions/session-a.json
```

反向：

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

这一轮只做到：

```text
save
↓
load
↓
验证历史还在
```

所以：

```text
05 = Persistence
```

详细说明：[`05-persist-session/README.md`](./05-persist-session/README.md)

---

# Session 06 · Resume Session

核心问题：**Session 从磁盘加载回来以后，Agent 怎么从这份历史继续往前走？**

运行：

```bash
npm run session:06
```

完整流程：

```text
Process #1
↓
Agent Run
↓
完整 Session History
↓
saveSession()
↓
程序结束

Process #2
↓
new Map()
↓
loadSession(sessionId)
↓
恢复 Session
↓
runAgentInSession()
↓
模型使用旧历史回答新问题
↓
新历史继续追加
↓
saveSession()
```

默认场景会在 Process #1 中记住：

```text
RESUME-0601
```

Process #2 不会再次获得这个值作为当前 Prompt 的内容，而是只能从加载回来的旧 Session 中找到它。

Resume 成功后：

```text
old history
+
new user
+
new assistant
```

会继续组成同一个 Session，并再次保存到磁盘。

所以：

```text
06 = Continuity
```

详细说明：[`06-resume-session/README.md`](./06-resume-session/README.md)

---

## Session 六轮到底学到了什么？

```text
01 No Session
= 跨 Run 会失忆

02 In-Memory Session
= 多个 Run 可以共享历史

03 Full Session History
= Session 应该保存完整事实

04 Multiple Sessions
= 历史需要 Identity 和隔离

05 Persist Session
= 历史可以跨进程留下

06 Resume Session
= 加载历史以后可以继续 Agent Run
```

最后形成：

```text
Session
├── Identity
├── Full History
├── Persistence
└── Resume / Continuity
```

一句话总结：

> **Session 解决的不是“模型记忆”，而是应用如何保存、区分、恢复并延续 Agent 的完整历史。**

---

## 为什么下一步是 Context？

Session 现在已经能保存完整历史：

```text
user
assistant(tool_call)
tool(result)
assistant(final)
...
```

而且可以不断 Resume。

新的问题自然出现：

> **Session 有 1000 条历史时，每次调用 LLM 都应该把 1000 条全部发进去吗？**

所以接下来进入：

```text
05 · Context
```

要开始明确一个非常重要的边界：

```text
Session
= 完整保存发生过什么

Context
= 这一轮模型实际看到什么
```

暂时还不讨论 Compaction；先把 Context 的选择边界搞清楚。

---

## Done 标准

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
- [ ] 我能解释多个 Session 为什么必须隔离。

### Session 05

- [ ] 我能解释 `saveSession()` / `loadSession()`。
- [ ] 我知道 Persistence 只是把历史保存和恢复。

### Session 06

- [ ] 我能区分 Persist 和 Resume。
- [ ] 我能画出 `load → run → append → save`。
- [ ] 我知道新进程恢复的是同一个 Session Identity 和 Full History。
- [ ] 我知道 Resume 后产生的新历史会继续追加到原 Session。
- [ ] 我知道 Resume 后还需要再次持久化。
- [ ] 我知道 Session 和 Context 是不同层的问题。

做到这些，`04 · Session` 可以封板，下一阶段进入 **05 · Context**。
