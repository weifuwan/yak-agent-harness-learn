# Recovery 01 · No Recovery

> 核心问题：**如果 Agent 执行到一半失败，但没有任何恢复能力，会发生什么？**

运行：

```bash
npm run recovery:01
```

---

## 这一轮故意没有 Recovery

流程只有：

```text
Step 1
↓
Step 2
↓
Step 3
↓
throw Error
↓
Run 结束
```

没有：

```text
Retry
Run State
Checkpoint
Resume
Rollback
```

---

## 默认实验

第一次执行：

```text
Step 1 · write A  ✅
Step 2 · write B  ✅
Step 3 · fail     ❌
```

失败以后：

```text
A 已经写入
B 已经写入

但：
recovery state = NONE
resume point   = UNKNOWN
```

也就是说：

> **失败发生了，副作用也已经发生了，但 Runtime 没有保存‘做到哪一步’。**

为了暴露问题，Demo 会故意做一次最天真的恢复方式：

```text
不知道从哪里继续
↓
整段从 Step 1 重新运行
```

于是得到：

```text
A 写入 2 次
B 写入 2 次
Step 3 再次失败
```

这说明：

> **没有 Recovery 时，盲目重跑可能重复已经成功的副作用。**

---

## Session 不是 Recovery

即使 Session 保存了聊天历史：

```text
用户说了什么
模型回复了什么
调用过什么 Tool
```

也不自动等于：

```text
哪些执行步骤已经成功
失败发生在哪一步
从哪里继续
哪些副作用需要撤销
```

所以：

```text
Session
= 历史连续性

Recovery
= 失败后的执行恢复
```

---

## 这一轮只暴露问题

当前 `runWithoutRecovery()` 只是：

```ts
for (const step of steps) {
  await step.execute()
}
```

某一步抛错后直接结束。

这轮不提前解决问题。

记成：

```text
01 = Failure
```

---

## 下一步为什么是 Retry？

现在任何失败都会直接终止 Run。

但有些失败可能只是临时问题，例如：

```text
timeout
临时网络错误
短暂不可用
```

于是第一个最自然的问题是：

> **同一步失败后，能不能再试一次？**

下一轮：

```text
recovery:02 · Retry
```

暂时仍不进入：

```text
Run State
Checkpoint
Resume
Rollback
复杂事务
```
