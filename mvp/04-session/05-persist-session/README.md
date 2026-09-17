# Session 05 · Persist Session

> 核心问题：**Session 已经有 id 和完整历史了，程序退出以后怎么留下来？**

上一轮 `session:04` 使用：

```ts
Map<string, Session>
```

它解决了多 Session 隔离，但所有数据仍然只存在于当前进程内存。

程序退出以后：

```text
session-a
session-b
↓
全部消失
```

这一轮第一次引入最小持久化：

```text
Session
↓
JSON.stringify()
↓
.sessions/session-a.json
```

以及：

```ts
saveSession(session)
loadSession(sessionId)
```

---

## 运行

```bash
npm run session:05
```

程序会经历：

```text
Process #1
↓
创建内存 Session
↓
Agent 调用 get_current_time
↓
完整历史进入 Session
↓
saveSession()
↓
.sessions/session-a.json

Process #2
↓
new Map()
↓
初始没有任何 Session
↓
loadSession("session-a")
↓
从 JSON 恢复 Session
```

重点观察：

```text
Process #2 store size before load: 0
Process #2 store size after load : 1
```

以及 Tool Result 在保存前、加载后完全一致。

---

## 为什么保存完整 Session？

`session:03` 已经确定 Session 是完整事实历史：

```text
user
assistant(tool_call)
tool(result)
assistant(final)
```

所以持久化不能只保存最终聊天文本。

JSON 中保存的是整个：

```ts
{
  id,
  messages
}
```

包括 Tool Call 和 Tool Result。

---

## 为什么不用数据库？

这一轮的问题只是：

> **内存状态怎么变成跨进程可保存的状态？**

JSON 文件已经足够验证这个概念。

暂时不引入：

```text
SQLite
PostgreSQL
Redis
事务
并发写入
版本迁移
```

这些不是当前学习问题。

---

## save 和 Resume 不是一回事

这一轮只做到：

```text
save
↓
load
↓
验证历史恢复
```

不会在 load 之后再次调用 Agent。

所以：

```text
session:05
= Persistence
= 历史能留下

session:06
= Resume
= 恢复历史后继续运行
```

---

## 当前边界

当前文件存储只是学习实现：

- Session id 只允许字母、数字、`_`、`-`。
- 一个 Session 对应一个 JSON 文件。
- `loadSession()` 会做最小结构校验。
- `.sessions/` 是运行数据，不进入 Git。
- 暂不处理并发写、原子替换、文件损坏恢复。

这些复杂度以后真的遇到问题再引入。

---

## Done 标准

- [ ] 我知道为什么 `Map<string, Session>` 不能跨进程存在。
- [ ] 我能解释 `saveSession()`。
- [ ] 我能解释 `loadSession()`。
- [ ] 我知道 JSON 中保存的是完整 Session，而不是聊天摘要。
- [ ] 我知道新进程的内存 Store 可以从磁盘重新构建。
- [ ] 我能区分 Persistence 和 Resume。
- [ ] 我知道这一轮还没有继续 Agent 对话。

做到这些，就进入 **session:06 · Resume Session**。
