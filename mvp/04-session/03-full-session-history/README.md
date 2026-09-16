# Session 03 · Full Session History

核心问题：**Session 只保存 user / assistant 最终文本，真的够吗？**

答案：不够。

`session:02` 已经能让两个 Run 连续对话，但它只保存：

```text
user
assistant(final)
```

如果一次 Agent Run 中发生过 Tool 调用，真正历史其实是：

```text
user
↓
assistant(tool_call)
↓
tool(result)
↓
assistant(final)
```

如果只保存最终文本，中间发生的 Tool Call / Tool Result 就会永久丢失。

---

## 这一轮新增什么？

Session Message 第一次支持三种角色：

```ts
type SessionMessage =
  | { role: "user"; content: string }
  | {
      role: "assistant"
      content: string | null
      tool_calls?: ToolCall[]
    }
  | {
      role: "tool"
      tool_call_id: string
      content: string
    }
```

运行过程中，每个真正发生的消息都立即写入 Session：

```text
User Message
↓
写入 Session
↓
LLM
↓
Assistant Tool Call
↓
写入 Session
↓
Execute Tool
↓
Tool Result
↓
写入 Session
↓
LLM
↓
Final Assistant
↓
写入 Session
```

所以这一轮开始：

> **Session 表示完整 Agent History，而不只是聊天摘要。**

---

## 运行

```bash
npm run session:03
```

Run #1 会要求模型必须调用：

```text
get_current_time
```

但最终回答故意只允许说：

```text
时间已记录
```

所以具体时间只存在于：

```text
tool(result)
```

Run #1 后 Session 应该类似：

```text
1. user: 请调用 get_current_time...
2. assistant(tool_call): get_current_time {}
3. tool(...): 2026-09-16T...
4. assistant: 时间已记录
```

Run #2 不提供任何 Tool，只问：

```text
上一轮 get_current_time 返回的精确时间是什么？
```

如果模型还能回答那个精确时间，说明第二轮真正读到了 Session 中保存的 Tool Result。

---

## 02 和 03 的区别

```text
session:02
Session = 对话结果

session:03
Session = 完整 Agent 事实历史
```

或者更具体：

```text
02
user
assistant(final)

03
user
assistant(tool_call)
tool(result)
assistant(final)
```

---

## 为什么这一步重要？

以后很多能力都依赖完整历史：

```text
Resume
Recovery
Debug
Audit
Context Building
```

如果 Tool Call / Tool Result 没有保存，程序以后只能知道：

```text
模型最后说了什么
```

却不知道：

```text
模型调用了什么？
参数是什么？
工具返回了什么？
最终答案依据什么？
```

---

## 这一轮仍然不做什么？

仍然只有一个内存 Session。

暂时不做：

```text
sessionId
多 Session
文件持久化
数据库
Resume
Context 裁剪
Compaction
```

下一轮才进入：

```text
session:04 · Multiple Sessions
```

解决：

> **如果同时存在多段不同对话，怎么保证历史不串线？**

---

## Done 标准

- [ ] 我知道为什么 user / assistant 最终文本不等于完整 Agent History。
- [ ] 我能解释 assistant(tool_call) 为什么必须保存。
- [ ] 我能解释 tool(result) 为什么必须保存。
- [ ] 我能画出 `user → assistant(tool_call) → tool(result) → assistant(final)`。
- [ ] 我知道 Session 开始承担“完整事实历史”的角色。
- [ ] 我知道这一轮仍然只在内存里。
- [ ] 我知道下一步为什么需要 Multiple Sessions。
