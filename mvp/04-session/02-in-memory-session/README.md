# Session 02 · In-Memory Session

> 核心问题：**两个 Agent Run 怎么先在同一个进程里共享历史？**

## 先看 Session 01 的问题

`session:01` 中：

```text
Run #1
↓
runAgent() 结束
↓
历史消失
↓
Run #2
↓
完全不知道 Run #1 发生过什么
```

所以这一轮第一次引入最小 Session：

```ts
type Session = {
  messages: SessionMessage[]
}
```

## 最小流程

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

关键点：

> **不是模型自己记住了，而是应用保存历史，并在下一次调用时重新传给模型。**

## 运行

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

程序会打印：

```text
[Session · initial]
messages: 0

[Session · after run #1]
messages: 2

[Session · after run #2]
messages: 4
```

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

因为下一轮 `session:03` 要专门回答：

> **Session 只保存聊天文本真的够吗？**

## 当前限制

```text
只有一个 Session
只存在于内存
进程退出就丢失
不保存完整 Tool 历史
不做 Context 裁剪
不做 Compaction
```

这些限制都是刻意保留的。

## Done 标准

- [ ] 我能解释为什么模型不是自己记住历史。
- [ ] 我知道 `Session.messages` 为什么能跨多个 Run 存在。
- [ ] 我能画出 `Run #1 → Session → Run #2`。
- [ ] 我知道当前 Session 只保存 user / assistant 文本。
- [ ] 我知道进程退出后 Session 仍然会丢失。
- [ ] 我知道下一步为什么要研究 Full Session History。

一句话：

> **Session 02 第一次让多个 Agent Run 共用一份应用侧内存历史。**
