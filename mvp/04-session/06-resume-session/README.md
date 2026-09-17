# Session 06 · Resume Session

> 核心问题：**Session 已经能从磁盘加载回来，Agent 怎么从这份历史继续往前走？**

`session:05` 已经做到：

```text
save
↓
load
↓
历史恢复
```

但它故意停在这里，没有继续运行 Agent。

这一轮补上最后一段：

```text
load
↓
放回新的 SessionStore
↓
runAgentInSession()
↓
继续追加历史
↓
save
```

这才叫 Resume。

---

## 运行

```bash
npm run session:06
```

默认场景分成两个“进程”。

### Process #1

```text
session-resume
↓
User:
记住 RESUME-0601
↓
Assistant:
RESUME-0601
↓
saveSession()
↓
.sessions/session-resume.json
```

### Process #2

重新创建一个空 Store：

```text
new Map()
↓
size = 0
```

然后：

```text
loadSession("session-resume")
↓
放入新的 Store
↓
User:
上一轮让我记住的会话代号是什么？
↓
Agent 使用已经恢复的历史
↓
Assistant:
RESUME-0601
```

接着新的 user / assistant 会继续追加到同一个 Session。

最后再次：

```text
saveSession()
```

确保 Resume 之后产生的新历史也继续持久化。

---

## Persist 和 Resume 的区别

### Persist

```text
过去发生过什么
↓
保存下来
↓
以后还能加载回来
```

解决：

> 数据还在不在？

### Resume

```text
load old history
↓
继续 Agent Run
↓
产生 new history
↓
再次 save
```

解决：

> Agent 能不能从过去继续往前走？

所以：

```text
05 = Persistence
06 = Continuity
```

---

## 现在 Session 已经具备什么？

经过 01～06：

```text
History
= 保存真正发生过什么

Identity
= 这些历史属于哪个 sessionId

Persistence
= 进程结束后历史仍然存在

Resume
= 新进程可以加载历史并继续运行
```

因此完整闭环是：

```text
sessionId
↓
load Session
↓
Agent Run
↓
append full history
↓
save Session
↓
程序结束
↓
下一次重新 load
↓
继续 Agent Run
```

---

## 当前边界

这一章仍然没有处理：

```text
Session 太长怎么办？
每轮真的要把全部 Session 发给模型吗？
哪些历史应该进入本轮模型上下文？
Token 超限怎么办？
```

这些不是 Session 的问题。

它们会自然进入下一阶段：

```text
05 · Context
```

最重要的边界：

```text
Session
= 完整事实历史

Context
= 这一轮模型实际看到什么
```

---

## Done 标准

- [ ] 我能区分 Persist 和 Resume。
- [ ] 我知道 Resume 必须先恢复同一个 Session Identity 和 History。
- [ ] 我知道新进程可以把加载后的 Session 放回新的 SessionStore。
- [ ] 我知道 Resume 后产生的新历史仍然应该继续追加到原 Session。
- [ ] 我知道 Resume 后还需要再次持久化。
- [ ] 我能画出 `load → run → append → save`。
- [ ] 我知道 Session 到这里解决的是完整历史连续性，而不是 Context 选择。

做到这些，`04 · Session` 可以封板，下一阶段进入 **05 · Context**。
