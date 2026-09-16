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
02 In-Memory Session     ← 当前
03 Full Session History  ← 后续
04 Multiple Sessions     ← 后续
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

运行：

```bash
npm run session:01
```

程序执行两次完全独立的 Agent Run：

```text
Run #1
↓
模型看到临时代号 YAK-SESSION-0427
↓
Run 结束

Run #2
↓
问“刚才的代号是什么？”
↓
没有 Run #1 的 messages
```

结论：

```text
Agent Loop 能完成一次 Run
≠
多个 Run 会自动形成连续对话
```

详细说明：[`01-no-session/README.md`](./01-no-session/README.md)

---

# Session 02 · In-Memory Session

核心问题：**两个 Agent Run 怎么先在同一个进程里共享历史？**

这一轮第一次定义：

```ts
type Session = {
  messages: SessionMessage[]
}
```

最小流程：

```text
createSession()
↓
Session.messages = []
↓
Run #1
↓
user + final assistant
写回 Session
↓
Run #2
↓
重新把 Session.messages 发给模型
↓
模型可以继续上一轮对话
```

运行：

```bash
npm run session:02
```

默认场景：

```text
Run #1
User: 记住 YAK-SESSION-0427
Assistant: YAK-SESSION-0427

Run #2
User: 刚才的代号是什么？
Assistant: YAK-SESSION-0427
```

你会看到 Session 快照：

```text
initial      → messages: 0
after run #1 → messages: 2
after run #2 → messages: 4
```

这一轮最重要的认识：

> **模型并没有自己记住，而是应用把上一轮历史重新传给模型。**

## 这一轮故意只保存文本

当前 Session 只保存：

```text
user
assistant(final text)
```

暂时不保存：

```text
assistant(tool_calls)
tool(result)
```

因为下一轮要专门研究：

> **只保存聊天文本，真的能代表 Agent 完整发生历史吗？**

详细说明：[`02-in-memory-session/README.md`](./02-in-memory-session/README.md)

---

## 为什么下一步是 Full Session History？

现在跨 Run 已经可以继续对话了。

但如果 Run 中发生：

```text
assistant(tool_call)
↓
tool(result)
↓
assistant(final answer)
```

当前 Session 最终只留下：

```text
user
assistant(final answer)
```

中间真正执行过什么 Tool、Tool 返回了什么，都没有保存。

所以下一轮进入：

```text
session:03 · Full Session History
```

解决：

> **Session 到底应该保存哪些事件，才能成为 Agent 的完整历史？**

---

## 当前 Done 标准

### Session 01

- [ ] 我知道为什么两个 `runAgent()` 默认互相隔离。
- [ ] 我知道 LoopState 只属于一次 Agent Run。

### Session 02

- [ ] 我能解释 `Session.messages`。
- [ ] 我知道为什么同一个 Session 可以跨多个 Run 使用。
- [ ] 我知道模型不是自己记住历史，而是应用重新传入历史。
- [ ] 我能画出 `Run #1 → Session → Run #2`。
- [ ] 我知道当前 Session 只存在于内存。
- [ ] 我知道进程退出后它仍然会消失。
- [ ] 我知道当前只保存 user / assistant 文本。
- [ ] 我知道下一步为什么要保存完整 Tool 历史。

做到这些，就进入 **session:03 · Full Session History**。
