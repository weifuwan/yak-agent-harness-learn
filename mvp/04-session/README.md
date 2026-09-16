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
03 Full Session History  ← 当前
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
Agent Loop 能完成一次 Run
≠
多个 Run 会自动形成连续对话
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

最小流程：

```text
Session.messages
↓
Run #1
↓
保存 user + assistant(final)
↓
Run #2
↓
重新把 Session.messages 发给模型
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

还没有保存：

```text
assistant(tool_call)
tool(result)
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

默认场景：

```text
Run #1
↓
User 要求调用 get_current_time
↓
Assistant Tool Call
↓
Tool Result = 精确时间
↓
Final Assistant = “时间已记录”
```

注意：最终回答故意不包含具体时间。

但是 Session 会完整留下：

```text
1. user
2. assistant(tool_call)
3. tool(result)
4. assistant(final)
```

接着 Run #2：

```text
不调用任何 Tool
↓
直接从 Session 历史中
读取上一轮 Tool Result 的精确时间
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

## 为什么下一步是 Multiple Sessions？

现在已经有一份完整 Session：

```text
user
assistant(tool_call)
tool(result)
assistant(final)
...
```

但目前只有：

```ts
const session = createSession()
```

如果同时有两段不同对话：

```text
对话 A
对话 B
```

它们应该共享同一个 `messages` 吗？

显然不应该。

所以下一轮进入：

```text
session:04 · Multiple Sessions
```

解决：

> **这些完整历史到底属于哪个 Session？怎么避免不同会话串线？**

暂时仍然不做持久化、数据库、Resume、Context 裁剪和 Compaction。

---

## 当前 Done 标准

### Session 01

- [ ] 我知道为什么两个 `runAgent()` 默认互相隔离。

### Session 02

- [ ] 我能解释 `Session.messages`。
- [ ] 我知道模型不是自己记住历史。
- [ ] 我知道同一个内存 Session 可以跨多个 Run 使用。

### Session 03

- [ ] 我知道 user / assistant(final) 不等于完整 Agent History。
- [ ] 我能解释为什么 assistant(tool_call) 必须保存。
- [ ] 我能解释为什么 tool(result) 必须保存。
- [ ] 我能画出 `user → assistant(tool_call) → tool(result) → assistant(final)`。
- [ ] 我知道 Session 从这一轮开始表示完整事实历史。
- [ ] 我知道当前仍然只有一个内存 Session。
- [ ] 我知道下一步为什么需要 Multiple Sessions。

做到这些，就进入 **session:04 · Multiple Sessions**。
