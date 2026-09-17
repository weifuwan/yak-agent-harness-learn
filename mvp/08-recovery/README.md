# 08 · Recovery 学习

> 核心问题：**模型失败、Tool 失败、进程退出、代码改坏以后怎么办？**

当前状态：`LEARNING`

核心边界：

```text
Session
= 之前发生过什么

Recovery
= 失败以后怎么办
```

以及：

```text
Permission
= Action 发生之前决定能不能做

Recovery
= Failure 已经发生以后决定怎么继续
```

---

## 学习路线

```text
01 No Recovery
   ↓
02 Retry
   ↓
03 Run State
   ↓
04 Checkpoint / Snapshot
   ↓
05 Resume / Rollback
   ↓
06 Minimal Recovery Runtime
```

当前进度：

```text
01 No Recovery                 ✅
02 Retry                       ← 当前
03 Run State                   ← 后续
04 Checkpoint / Snapshot       ← 后续
05 Resume / Rollback           ← 后续
06 Minimal Recovery Runtime    ← 后续
```

---

# 01 · No Recovery

运行：

```bash
npm run recovery:01
```

故意让：

```text
Step 1 · write A  ✅
Step 2 · write B  ✅
Step 3 · fail     ❌
```

失败后没有：

```text
Retry
Run State
Checkpoint
Resume
Rollback
```

然后整段从头重跑，A / B 的副作用会重复。

这轮看到：

> **没有 Recovery 时，失败不仅会终止 Run，盲目重跑还可能重复已经成功的副作用。**

```text
01 = Failure
```

详细：[`01-no-recovery/README.md`](./01-no-recovery/README.md)

---

# 02 · Retry

核心问题：

> **当前这一步只是临时失败，能不能不要立刻结束整个 Run，而是在当前步骤内再试一次？**

运行：

```bash
npm run recovery:02
```

这一轮第一次引入：

```ts
retryOperation(operation, {
  maxAttempts: 3,
})
```

### Case A · Temporary Failure

```text
attempt 1 → fail
attempt 2 → fail
attempt 3 → success
```

结果：

```text
status   = success
attempts = 3
```

说明临时失败可以在当前 Operation 内通过 Retry 恢复。

### Case B · Exhausted Attempts

```text
attempt 1 → fail
attempt 2 → fail
attempt 3 → fail
```

达到：

```text
maxAttempts = 3
```

以后停止：

```text
status = failed
```

所以 Retry 不是无限循环。

这一轮最重要的边界：

```text
Retry
= 当前这一步再试

Resume
= 整个 Run 从失败点继续
```

它们不是一回事。

当前 `retryOperation()` 只知道：

```text
attempt 1 / 2 / 3
```

还不知道：

```text
Step 1 是否成功
Step 2 是否成功
整个 Run 失败在哪一步
下次应该从哪里继续
```

另外，并不是所有副作用都天然适合 Retry。

例如：

```text
write_file 已经成功
只是响应结果丢了
```

盲目 Retry 可能重复副作用。

这一轮只建立边界，不提前进入 Idempotency。

```text
02 = Retry
```

详细：[`02-retry/README.md`](./02-retry/README.md)

---

## 前两轮连起来

```text
01 = Failure
失败直接结束

02 = Retry
同一步有限次再试
```

---

## 为什么下一步是 Run State？

现在 Retry 已经能处理：

```text
当前 Operation 的临时失败
```

但它完全不知道整个 Run 的执行状态。

比如：

```text
Step 1 success
Step 2 success
Step 3 retry exhausted
Step 4 pending
```

如果没有状态记录，Runtime 仍然无法回答：

```text
做到哪一步？
哪些已经成功？
哪些还没跑？
```

所以下一轮进入：

```text
recovery:03 · Run State
```

第一次记录整个 Run 的步骤状态。

---

## 当前仍然不进入

```text
Checkpoint / Snapshot
Resume
Rollback
Retry Backoff
Jitter
错误分类体系
Idempotency Key
事务
Saga
```

---

## 当前 Done 标准

### Recovery 02

- [ ] 我知道 Retry 解决的是当前 Operation 的临时失败。
- [ ] 我知道 Retry 必须有 `maxAttempts`，不能无限重试。
- [ ] 我知道超过最大次数后仍然可能失败。
- [ ] 我知道 Retry 不等于 Resume。
- [ ] 我知道 Retry 还不知道整个 Run 做到哪一步。
- [ ] 我知道副作用操作不能因为有 Retry 就默认安全重试。
- [ ] 我知道 `01 = Failure`，`02 = Retry`。
- [ ] 我知道下一步为什么需要 Run State。

做到这些，就进入 **recovery:03 · Run State**。
