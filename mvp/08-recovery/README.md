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
03 Run State                   ✅
04 Checkpoint / Snapshot       ✅
05 Resume / Rollback           ← 当前
06 Minimal Recovery Runtime    ← 后续
```

---

# 01 · No Recovery

```bash
npm run recovery:01
```

失败后没有恢复状态，天真地整段重跑会重复已经成功的副作用。

```text
01 = Failure
```

详细：[`01-no-recovery/README.md`](./01-no-recovery/README.md)

---

# 02 · Retry

```bash
npm run recovery:02
```

只解决：

```text
当前 Operation 失败
↓
有限次再试
```

```text
02 = Retry
```

详细：[`02-retry/README.md`](./02-retry/README.md)

---

# 03 · Run State

```bash
npm run recovery:03
```

第一次记录整个 Run：

```text
run status
currentStepId
lastError
steps[]
```

所以 Runtime 第一次知道做到哪一步。

```text
03 = State
```

详细：[`03-run-state/README.md`](./03-run-state/README.md)

---

# 04 · Checkpoint / Snapshot

```bash
npm run recovery:04
```

第一次保存副作用发生前的世界状态：

```text
Checkpoint
├── Snapshot A = OLD-A
└── Snapshot B = OLD-B
```

所以：

```text
Run State
= 我执行到哪了

Snapshot
= 当时世界是什么样
```

```text
04 = Checkpoint
```

详细：[`04-checkpoint-snapshot/README.md`](./04-checkpoint-snapshot/README.md)

---

# 05 · Resume / Rollback

核心问题：

> **已经有 Run State 和 Checkpoint 以后，失败时到底是继续往前，还是回到之前的安全状态？**

运行：

```bash
npm run recovery:05
```

这一轮第一次真正做恢复。

## Resume

```text
Step 1 success
Step 2 success
Step 3 failed
Step 4 pending

↓ Resume

跳过 Step 1 / 2
重新执行 Step 3
继续 Step 4
```

关键：

> **已经 success 的 Step 不应重复执行。**

默认实验会验证 A / B 在 Resume 前后都只写入一次。

## Rollback

```text
Checkpoint:
A = OLD-A
B = OLD-B

Current:
A = NEW-A
B = NEW-B

↓ Rollback

A = OLD-A
B = OLD-B
```

Rollback 不继续 Run，而是使用 Checkpoint 恢复文件世界。

当前学习版 Rollback 后，原来的 failed Run 仍保持 failed；这里只恢复副作用状态，不伪造执行成功。

### Retry / Resume / Rollback

```text
Retry
= 当前这一步再试

Resume
= 从失败点继续整个 Run

Rollback
= 回到之前的安全状态
```

```text
05 = Recover
```

详细：[`05-resume-rollback/README.md`](./05-resume-rollback/README.md)

---

## 五轮连起来

```text
01 = Failure
失败直接结束

02 = Retry
同一步有限次再试

03 = State
知道整个 Run 做到哪

04 = Checkpoint
保存恢复所需的旧世界状态

05 = Recover
真正 Resume / Rollback
```

---

## 为什么下一步是 Minimal Recovery Runtime？

现在能力还是分散的：

```text
retryOperation()
createRunState()
runWithState()
createCheckpoint()
resumeRun()
rollbackCheckpoint()
```

下一轮：

```text
recovery:06 · Minimal Recovery Runtime
```

会把 Retry / State / Checkpoint / Resume / Rollback 收成统一入口，让 Agent Runtime 不需要自己编排恢复细节。

---

## 当前仍然不进入

```text
Run State 持久化
Checkpoint 持久化
进程重启恢复
Git Snapshot
数据库事务
Saga
复杂 Retry Backoff
自动恢复策略
```

---

## 当前 Done 标准

### Recovery 05

- [ ] 我能区分 Retry、Resume、Rollback。
- [ ] 我知道 Resume 应跳过已经 success 的 Step。
- [ ] 我知道 Resume 的目的是避免重复已经成功的副作用。
- [ ] 我知道 Rollback 依赖 Checkpoint / Snapshot。
- [ ] 我知道 Rollback 恢复世界状态，不等于 Run 自动变成 success。
- [ ] 我知道 `04 = Checkpoint`，`05 = Recover`。
- [ ] 我知道下一步为什么要收成 Minimal Recovery Runtime。

做到这些，就进入 **recovery:06 · Minimal Recovery Runtime**。
