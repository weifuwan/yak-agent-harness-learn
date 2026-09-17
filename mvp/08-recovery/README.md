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
02 Retry                       ✅
03 Run State                   ← 当前
04 Checkpoint / Snapshot       ← 后续
05 Resume / Rollback           ← 后续
06 Minimal Recovery Runtime    ← 后续
```

---

# 01 · No Recovery

```bash
npm run recovery:01
```

故意让：

```text
Step 1 success
Step 2 success
Step 3 failed
```

失败后没有恢复状态，只能天真地整段重跑，已成功副作用可能重复。

```text
01 = Failure
```

详细：[`01-no-recovery/README.md`](./01-no-recovery/README.md)

---

# 02 · Retry

```bash
npm run recovery:02
```

第一次引入：

```ts
retryOperation(operation, {
  maxAttempts: 3,
})
```

只解决：

```text
当前 Operation 失败
↓
有限次再试
```

它还不知道整个 Run 做到哪里。

```text
02 = Retry
```

详细：[`02-retry/README.md`](./02-retry/README.md)

---

# 03 · Run State

核心问题：

> **Retry 只知道当前 Operation 试了几次，整个 Run 到底执行到哪一步，谁来记录？**

运行：

```bash
npm run recovery:03
```

这一轮第一次引入：

```ts
RunState
```

最小状态：

```text
runId
run status
currentStepId
lastError
steps[]
```

每个 Step 有：

```text
pending
running
success
failed
```

默认实验：

```text
Step 1 · write A
→ success

Step 2 · write B
→ success

Step 3 · run test
→ Retry 2 次
→ failed

Step 4 · write report
→ pending
```

最终：

```text
run status   = failed
current step = step-03

step-01 = success
step-02 = success
step-03 = failed
step-04 = pending
```

所以 Runtime 第一次能回答：

```text
做到哪一步？
哪些已经成功？
哪一步失败？
哪些还没执行？
```

### Retry 和 Run State 的区别

```text
Retry
= 当前 Step 试了几次
```

```text
Run State
= 整个 Run 现在是什么状态
```

### Session 和 Run State 也不同

```text
Session
= Agent 的完整交互历史

Run State
= 一次任务执行的步骤状态
```

当前 `RunState` 只是内存对象：

```text
进程退出
↓
状态仍然会丢
```

这一轮还不会：

```text
Resume
Rollback
Checkpoint / Snapshot
自动跳过 success Step
持久化 Run State
```

```text
03 = State
```

详细：[`03-run-state/README.md`](./03-run-state/README.md)

---

## 三轮连起来

```text
01 = Failure
失败直接结束

02 = Retry
同一步有限次再试

03 = State
记录整个 Run 执行到哪
```

---

## 为什么下一步是 Checkpoint / Snapshot？

现在已经知道：

```text
Step 1 success
Step 2 success
Step 3 failed
```

但如果 Step 2 修改了文件，Run State 只能告诉我们：

```text
Step 2 成功执行过
```

它不知道：

```text
Step 2 执行之前，文件原来是什么内容？
```

所以即使知道失败在哪，也还没有足够的信息 Rollback。

下一轮进入：

```text
recovery:04 · Checkpoint / Snapshot
```

第一次保存“副作用发生前的世界状态”。

---

## 当前仍然不进入

```text
Resume
Rollback
持久化 Run State
复杂 Retry Backoff
Jitter
Idempotency Key
事务
Saga
```

---

## 当前 Done 标准

### Recovery 03

- [ ] 我能解释 Retry 和 Run State 的区别。
- [ ] 我知道 Run State 需要记录 Run 和 Step 两层状态。
- [ ] 我知道失败后剩余 Step 应保持 pending。
- [ ] 我能从 Run State 看出当前失败点。
- [ ] 我知道 Session 不等于 Run State。
- [ ] 我知道“知道执行到哪”还不等于“已经能 Resume”。
- [ ] 我知道 Run State 不能恢复文件修改前的内容。
- [ ] 我知道 `01 = Failure`、`02 = Retry`、`03 = State`。
- [ ] 我知道下一步为什么需要 Checkpoint / Snapshot。

做到这些，就进入 **recovery:04 · Checkpoint / Snapshot**。
