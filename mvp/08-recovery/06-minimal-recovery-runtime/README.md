# Recovery 06 · Minimal Recovery Runtime

> 核心问题：**Retry、Run State、Checkpoint、Resume、Rollback 都已经会了，Agent Runtime 还需要自己编排这些细节吗？**

运行：

```bash
npm run recovery:06
```

这一轮不再增加新的恢复概念，只做最后收口。

---

## 统一入口

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

调用方只面对：

```text
run
resume
rollback
```

内部负责：

```text
Checkpoint
Run State
Retry
Resume
Rollback
```

---

## run()

```text
run()
↓
Create Checkpoint
↓
Create Run State
↓
Execute Steps
↓
Retry inside Step
↓
success / failed
```

调用方不再自己调用：

```text
createCheckpoint()
createRunState()
runWithState()
```

---

## resume()

只有 failed Run 才能 Resume：

```text
failed Run State
↓
找到 failed Step
↓
跳过 success Step
↓
从失败点继续
```

默认 Demo 会验证：

```text
A / B 在 Resume 前后都只写入一次
```

说明已经成功的副作用没有被重复执行。

---

## rollback()

```text
failed Run
+
run() 开始前创建的 Checkpoint
↓
恢复 Snapshot
```

默认 Demo：

```text
OLD-A / OLD-B
↓ run()
NEW-A / NEW-B
↓ failed
rollback()
↓
OLD-A / OLD-B
```

Rollback 只恢复文件世界，不把原来的 failed Run 伪造成 success。

---

## 六轮连起来

```text
01 = Failure
02 = Retry
03 = State
04 = Checkpoint
05 = Recover
06 = Runtime
```

一句话：

> **Recovery Runtime 把“失败以后怎么记录、怎么重试、怎么继续、怎么回滚”统一封装成一个运行时能力。**

---

## 当前明确缺陷

当前 Runtime 仍然只存在内存里：

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
自动恢复策略
复杂 Retry Backoff
```

这些属于后续更成熟的 Recovery Engineering。

---

## Done 标准

- [ ] 我知道 `run()` 为什么要同时创建 Checkpoint 和 Run State。
- [ ] 我知道 Retry 是 Step 内部能力，Resume 是 Run 级能力。
- [ ] 我知道 Resume 必须跳过已经 success 的 Step。
- [ ] 我知道 Rollback 使用 Checkpoint 恢复副作用状态。
- [ ] 我知道 Rollback 不等于原 Run 变成 success。
- [ ] 我知道 Agent Runtime 不应该自己编排 Recovery 内部函数。
- [ ] 我知道当前 Runtime 仍然不能跨进程恢复。
- [ ] 我能解释 `01 Failure → 02 Retry → 03 State → 04 Checkpoint → 05 Recover → 06 Runtime`。

做到这些，Recovery MVP 封板。
