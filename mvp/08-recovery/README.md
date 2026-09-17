# 08 · Recovery 学习

> 核心问题：**模型失败、Tool 失败、进程退出、代码改坏以后怎么办？**

状态：`COMPLETE`

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
01 No Recovery                 ✅
02 Retry                       ✅
03 Run State                   ✅
04 Checkpoint / Snapshot       ✅
05 Resume / Rollback           ✅
06 Minimal Recovery Runtime    ✅
```

---

# 01 · No Recovery

```bash
npm run recovery:01
```

故意让 Run 执行到一半失败，并观察：

```text
已成功副作用仍然存在
+
Runtime 不知道从哪里继续
+
从头重跑可能重复副作用
```

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

Retry 只解决当前 Step 的临时失败。

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

所以 Runtime 第一次知道：

```text
做到哪一步
哪些成功
哪一步失败
哪些还没执行
```

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

```bash
npm run recovery:05
```

第一次真正恢复：

```text
Resume
= 跳过 success Step，从 failed Step 继续
```

```text
Rollback
= 使用 Checkpoint 把副作用恢复到旧状态
```

三个概念边界：

```text
Retry
= 当前 Step 再试

Resume
= 整个 Run 从失败点继续

Rollback
= 回到之前的安全状态
```

```text
05 = Recover
```

详细：[`05-resume-rollback/README.md`](./05-resume-rollback/README.md)

---

# 06 · Minimal Recovery Runtime

```bash
npm run recovery:06
```

这一轮不再增加新概念，只把前面的能力收口成：

```ts
const runtime = createRecoveryRuntime({
  runId,
  steps,
  snapshotFiles,
})

await runtime.run()
await runtime.resume()
await runtime.rollback()
```

内部统一负责：

```text
Checkpoint
Run State
Retry
Resume
Rollback
```

流程：

```text
run()
↓
Create Checkpoint
↓
Create Run State
↓
Execute Steps + Retry
↓
success / failed

failed
↓
├── resume()
│   → 从 failed Step 继续
│
└── rollback()
    → 恢复 Checkpoint
```

调用方不再需要自己编排：

```text
retryOperation()
createRunState()
runWithState()
createCheckpoint()
resumeRun()
rollbackCheckpoint()
```

```text
06 = Runtime
```

详细：[`06-minimal-recovery-runtime/README.md`](./06-minimal-recovery-runtime/README.md)

---

## 六轮连起来

```text
01 = Failure
失败已经发生

02 = Retry
当前 Step 再试

03 = State
知道整个 Run 做到哪

04 = Checkpoint
保存恢复材料

05 = Recover
真正 Resume / Rollback

06 = Runtime
统一封装恢复流程
```

一句话：

> **Recovery Runtime 解决的不是“怎么避免失败”，而是“失败以后怎么记录、怎么重试、怎么继续、怎么回到安全状态”。**

---

## 当前明确缺陷

当前学习版仍然只存在内存里：

```text
进程退出
↓
Run State 丢失
Checkpoint 丢失
```

暂时不进入：

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

这些属于后续成熟 Recovery Engineering，而不是当前最小概念链路。

---

## Recovery Done 标准

- [ ] 我能区分 Failure / Retry / State / Checkpoint / Recover / Runtime。
- [ ] 我知道 Retry 和 Resume 不一样。
- [ ] 我知道 Run State 和 Snapshot 不一样。
- [ ] 我知道 Resume 为什么必须跳过 success Step。
- [ ] 我知道 Rollback 为什么必须依赖 Checkpoint。
- [ ] 我知道 Rollback 不代表原 Run 自动 success。
- [ ] 我知道 Agent Runtime 不应自己编排 Recovery 内部函数。
- [ ] 我知道当前 MVP 为什么还不能跨进程恢复。

做到这些，**08 · Recovery MVP COMPLETE**。
