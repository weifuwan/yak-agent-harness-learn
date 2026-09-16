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
01 No Session            ← 当前
02 In-Memory Session     ← 后续
03 Full Session History  ← 后续
04 Multiple Sessions     ← 后续
05 Persist Session       ← 后续
06 Resume Session        ← 后续
```

---

## Session 和 Agent Loop 的边界

Agent Loop 已经解决：

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

但是 Run 结束以后，内部的：

```text
messages
Tool Call
Tool Result
运行过程
```

并不会自动进入下一次 `runAgent()`。

所以 Session 要解决的是：

> **多个 Agent Run 之间，如何保留连续的历史。**

---

# Session 01 · No Session

核心问题：**两个 `runAgent()` 会自动共享历史吗？**

运行：

```bash
npm run session:01
```

程序会连续执行两次独立的 `runAgent()`：

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

这一轮故意不创建任何 Session。

独立说明：[`01-no-session/README.md`](./01-no-session/README.md)

---

## 为什么下一步是 In-Memory Session？

现在已经明确：

```text
Run #1 history
↓
runAgent() 结束
↓
Run #2 无法继续使用
```

下一轮只做最小答案：

```ts
type Session = {
  messages: Message[]
}
```

先让两个 Run 在同一进程里共享一份历史。

暂时不做：

```text
sessionId
多 Session
JSON 持久化
数据库
Context 裁剪
Compaction
```

---

## 当前 Done 标准

### Session 01

- [ ] 我知道为什么两个 `runAgent()` 默认互相隔离。
- [ ] 我知道 LoopState 只属于一次 Agent Run。
- [ ] 我知道 Agent Loop 和 Session 解决的是不同层的问题。
- [ ] 我能解释为什么现在还没有任何“记忆”。
- [ ] 我知道下一步为什么只需要先做 In-Memory Session。

做到这些，就进入 **session:02 · In-Memory Session**。
