# Session 01 · No Session

> 核心问题：**两个 `runAgent()` 之间会自动共享上一轮历史吗？**

答案：不会。

这一轮故意不实现 Session，只制造问题。

---

## 运行

```bash
npm run session:01
```

程序会执行两次完全独立的 Agent Run。

### Run #1

```text
User
↓
请记住这个临时代号：YAK-SESSION-0427
↓
runAgent()
↓
Assistant
YAK-SESSION-0427
↓
Run 结束
```

### Run #2

```text
User
↓
刚才你回复给我的临时代号是什么？
↓
新的 runAgent()
↓
？？？
```

第二次调用没有拿到第一次的 messages。

---

## 为什么不用 package.json version 做唯一演示？

因为当前 Agent 有 Tool。

如果第二轮问：

```text
那 version 呢？
```

模型可能重新调用 `read_file`，再次读取 `package.json`，最后碰巧得到正确答案。

这不能证明它记住了上一轮。

所以这一节使用：

```text
YAK-SESSION-0427
```

它只存在于 Run #1 的输入和输出里，Run #2 没有其他来源可以恢复它。

---

## 当前结构

`agent-loop:06` 已经有：

```ts
const result = await runAgent({
  prompt,
  tools,
  maxSteps,
})
```

但每次 `runAgent()` 都会重新创建自己的 `LoopState`：

```text
Run #1
create LoopState A
↓
执行
↓
返回 AgentRunResult
↓
A 不再暴露

Run #2
create LoopState B
↓
执行
```

这里没有：

```text
A.messages → B.messages
```

所以两个 Run 是隔离的。

---

## 这一轮不要解决

不要加：

```text
Session
sessionId
Map
JSON 文件
数据库
Redis
Context 裁剪
Compaction
```

现在只确认一个事实：

> **一次 Agent Run 的历史，不会天然变成下一次 Agent Run 的历史。**

---

## 为什么下一步是 In-Memory Session？

问题已经出现：

```text
Run #1 的历史
↓
Run 结束
↓
Run #2 拿不到
```

最小答案不是数据库，而只是：

```ts
type Session = {
  messages: Message[]
}
```

让两个 Run 共享同一份历史。

这就是下一轮：

```text
session:02 · In-Memory Session
```

---

## Done 标准

- [ ] 我知道 `runAgent()` 完成后，下一次调用不会自动继承历史。
- [ ] 我能解释为什么 LoopState 不等于 Session。
- [ ] 我知道 Agent Loop 解决的是一次 Run 内的循环。
- [ ] 我知道 Session 要解决的是多个 Run 之间的连续性。
- [ ] 我知道为什么这一轮故意不实现任何 Session。

一句话记住：

> **Agent Loop 让一次 Run 能持续执行；Session 才让多个 Run 能持续对话。**
