# Recovery 02 · Retry

> 核心问题：**当前这一步只是临时失败，能不能不要立刻结束整个 Run，而是再试一次？**

运行：

```bash
npm run recovery:02
```

---

## 从上一轮开始

`recovery:01` 中：

```text
Step fail
↓
Run 直接结束
```

这对临时失败太脆弱。

例如：

```text
timeout
临时网络错误
服务短暂不可用
```

所以这一轮第一次引入：

```ts
retryOperation(operation, {
  maxAttempts: 3,
})
```

---

## Case A · Temporary Failure

故意让 Operation：

```text
attempt 1 → fail
attempt 2 → fail
attempt 3 → success
```

观察：

```text
status   = success
attempts = 3
```

说明临时失败可以在当前步骤内部恢复。

---

## Case B · Exhausted Attempts

故意让 Operation 永远失败：

```text
attempt 1 → fail
attempt 2 → fail
attempt 3 → fail
```

达到：

```text
maxAttempts = 3
```

以后停止重试并返回：

```text
status = failed
```

所以 Retry 不是无限循环。

---

## Retry 解决了什么？

只解决：

```text
当前 Operation 失败
↓
同一步再试
```

也就是：

```text
02 = Retry
```

---

## Retry 没解决什么？

它还不知道整个 Run 的状态。

例如：

```text
Step 1 success
Step 2 success
Step 3 retry exhausted
```

当前 `retryOperation()` 并不知道：

```text
Step 1 / Step 2 是否成功
失败的是整个 Run 的第几步
下次应该从哪里继续
```

所以：

> **Retry ≠ Resume。**

另外，并不是所有副作用都天然适合 Retry。

例如：

```text
write_file 已经成功
只是返回结果丢失
```

如果盲目 Retry，可能重复副作用。

这一轮只建立这个边界，不提前设计 Idempotency。

---

## 01 和 02 的区别

```text
01 = Failure
失败直接结束
```

```text
02 = Retry
当前这一步可以有限次再试
```

---

## 当前仍然不做

```text
Run State
Checkpoint / Snapshot
Resume
Rollback
Retry Backoff
Jitter
错误分类体系
Idempotency Key
```

这些以后再长出来。

下一步：

```text
recovery:03 · Run State
```

开始回答：

> **整个 Run 到底执行到哪一步了？**
