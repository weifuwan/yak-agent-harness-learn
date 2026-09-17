# Recovery 05 · Resume / Rollback

> 核心问题：**现在已经有 Run State 和 Checkpoint，失败以后到底是继续往前，还是回到之前的安全状态？**

运行：

```bash
npm run recovery:05
```

---

## 从上一轮开始

我们已经有：

```text
Run State
= 知道做到哪一步

Checkpoint
= 知道失败前是什么状态
```

所以这一轮第一次真正做“恢复”。

---

## 两个方向

### Resume

```text
Step 1 success
Step 2 success
Step 3 failed
Step 4 pending

↓ resume

跳过 Step 1 / 2
重新执行 Step 3
继续 Step 4
```

重点：

> **已经 success 的 Step 不应该因为 Resume 再执行一次。**

否则已经发生过的副作用可能重复。

---

### Rollback

```text
Checkpoint:
A = OLD-A
B = OLD-B

Current:
A = NEW-A
B = NEW-B

↓ rollback

A = OLD-A
B = OLD-B
```

重点：

> **Rollback 不继续 Run，而是恢复之前保存的世界状态。**

---

## 默认实验

### Case A · Resume

第一次执行：

```text
Step 1 write A   → success
Step 2 write B   → success
Step 3 test      → failed
Step 4 report    → pending
```

外部条件修复以后：

```text
resumeRun(...)
```

最终：

```text
Step 1 / 2 被跳过
Step 3 success
Step 4 success
Run success
```

同时检查 A / B 仍然只写入一次，证明 success Step 没有被重复执行。

### Case B · Rollback

```text
OLD-A / OLD-B
↓ checkpoint
NEW-A / NEW-B
↓ test failed
rollbackCheckpoint(...)
↓
OLD-A / OLD-B
```

当前学习版 Rollback 只恢复文件状态，不把 failed Run 改写成 success。

---

## Retry / Resume / Rollback 的区别

```text
Retry
= 当前这一步再试

Resume
= 从失败点继续整个 Run

Rollback
= 回到之前的安全状态
```

所以：

```text
02 = Retry
03 = State
04 = Checkpoint
05 = Recover
```

---

## 这一轮仍然不做

```text
统一 Recovery Runtime
自动决定 Resume 还是 Rollback
Run State 持久化
Checkpoint 持久化
进程重启恢复
Git Snapshot
事务 / Saga
```

下一步：

```text
recovery:06 · Minimal Recovery Runtime
```

把 Retry / State / Checkpoint / Resume / Rollback 收成统一运行时能力。
