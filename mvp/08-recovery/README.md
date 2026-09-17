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
04 Checkpoint / Snapshot       ← 当前
05 Resume / Rollback           ← 后续
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

第一次引入：

```text
当前 Operation 失败
↓
有限次再试
```

Retry 只解决当前 Step，不知道整个 Run 做到哪里。

```text
02 = Retry
```

详细：[`02-retry/README.md`](./02-retry/README.md)

---

# 03 · Run State

```bash
npm run recovery:03
```

第一次记录：

```text
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

所以 Runtime 第一次知道：

```text
做到哪一步
哪些成功
哪一步失败
哪些还没执行
```

但 Run State 只保存执行状态，不知道文件修改前是什么样。

```text
03 = State
```

详细：[`03-run-state/README.md`](./03-run-state/README.md)

---

# 04 · Checkpoint / Snapshot

核心问题：

> **Run State 已经知道哪里失败，但失败以后如果想恢复，副作用发生前的世界是什么样？**

运行：

```bash
npm run recovery:04
```

这一轮第一次引入：

```ts
RecoveryCheckpoint
├── id
└── files[]
    ├── path
    └── content
```

默认实验：

```text
初始：
A = OLD-A
B = OLD-B

↓ Create Checkpoint

Snapshot:
A = OLD-A
B = OLD-B

↓ Execute

Step 1 → A = NEW-A → success
Step 2 → B = NEW-B → success
Step 3 → failed
Step 4 → pending
```

失败以后：

```text
Current:
A = NEW-A
B = NEW-B

Snapshot:
A = OLD-A
B = OLD-B
```

所以：

```text
Run State
= 我执行到哪了

Snapshot
= 当时世界是什么样
```

也就是：

```text
State
→ 恢复流程判断

Snapshot
→ 恢复数据材料
```

这一轮故意不执行 Rollback。

文件仍然保持：

```text
A = NEW-A
B = NEW-B
```

因为真正恢复旧状态要留给下一轮。

```text
04 = Checkpoint
```

详细：[`04-checkpoint-snapshot/README.md`](./04-checkpoint-snapshot/README.md)

---

## 四轮连起来

```text
01 = Failure
失败直接结束

02 = Retry
同一步有限次再试

03 = State
知道整个 Run 做到哪

04 = Checkpoint
保存恢复所需的旧世界状态
```

---

## 为什么下一步是 Resume / Rollback？

现在我们同时拥有：

```text
Run State
+
Checkpoint
```

所以终于可以真正问：

```text
失败以后，是继续往前跑？
还是恢复到旧状态？
```

这就是：

```text
Resume
= 从失败点继续

Rollback
= 回到 Checkpoint
```

下一轮进入：

```text
recovery:05 · Resume / Rollback
```

---

## 当前仍然不进入

```text
真正 Rollback
自动 Resume
Snapshot 持久化
Run State 持久化
Git Snapshot
事务
Saga
复杂 Retry Backoff
```

---

## 当前 Done 标准

### Recovery 04

- [ ] 我能解释 Run State 和 Snapshot 的区别。
- [ ] 我知道 Snapshot 必须在副作用发生前创建。
- [ ] 我知道失败以后 Current State 可以和 Snapshot 不同。
- [ ] 我知道 Snapshot 保存的是恢复材料，而不是执行流程。
- [ ] 我知道有 Snapshot 不等于已经 Rollback。
- [ ] 我知道 `03 = State`，`04 = Checkpoint`。
- [ ] 我知道下一步为什么自然进入 Resume / Rollback。

做到这些，就进入 **recovery:05 · Resume / Rollback**。
