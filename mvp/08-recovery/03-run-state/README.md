# Recovery 03 · Run State

> 核心问题：**Retry 只知道当前 Operation 试了几次，整个 Run 到底执行到哪一步，谁来记录？**

运行：

```bash
npm run recovery:03
```

---

## 从上一轮开始

`recovery:02` 已经有：

```text
Operation
↓
fail
↓
Retry
↓
success / failed
```

但 Retry 只知道：

```text
attempt 1
attempt 2
attempt 3
```

不知道整个任务：

```text
哪些 Step 已经成功？
哪一步失败？
哪些还没执行？
```

所以这一轮第一次引入：

```ts
RunState
```

---

## 最小状态模型

```ts
type RunStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"

type StepStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
```

一个最小 Run State 包含：

```text
runId
run status
currentStepId
lastError
steps[]
```

每个 Step State 包含：

```text
id
name
status
attempts
lastError
```

---

## 默认实验

```text
Step 1 · write A
→ success

Step 2 · write B
→ success

Step 3 · run test
→ attempt 1 fail
→ attempt 2 fail
→ failed

Step 4 · write report
→ pending
```

最终应该看到：

```text
run status   = failed
current step = step-03

step-01 = success
step-02 = success
step-03 = failed
step-04 = pending
```

所以 Runtime 第一次能够回答：

```text
做到哪一步？
哪些已经成功？
哪一步失败？
哪些还没开始？
```

---

## Retry 和 Run State 的区别

```text
Retry
= 当前这一步试了几次
```

```text
Run State
= 整个 Run 当前处于什么状态
```

本轮会复用 `recovery:02` 的 `retryOperation()`，但 Step 3 即使 Retry 用尽，Run State 仍然可以准确留下：

```text
Step 1 success
Step 2 success
Step 3 failed
Step 4 pending
```

---

## Session 和 Run State 也不是一回事

```text
Session
= Agent 的完整交互历史
```

```text
Run State
= 一次执行任务的步骤状态
```

可以把 Run State 理解成最小任务状态表。

---

## 这一轮故意不做什么？

当前 `RunState` 只是：

```text
in-memory object
```

所以：

```text
进程退出
↓
Run State 仍然会丢
```

同时这一轮也不会：

```text
Resume
Rollback
Checkpoint / Snapshot
自动跳过 success Step
持久化 Run State
```

因为当前目标只是先建立：

> **失败以后，Runtime 必须先知道自己执行到哪，后续才有资格谈恢复。**

---

## 为什么下一步是 Checkpoint / Snapshot？

现在已经知道：

```text
Step 1 success
Step 2 success
Step 3 failed
```

但假设 Step 2 修改了文件。

Run State 只能告诉我们：

```text
Step 2 成功执行过
```

却不知道：

```text
Step 2 执行之前，文件原来是什么内容？
```

所以还无法 Rollback。

下一轮进入：

```text
recovery:04 · Checkpoint / Snapshot
```

第一次保存“副作用发生前的世界状态”。

---

## 这一轮记住

```text
01 = Failure
02 = Retry
03 = State
```

一句话：

> **Retry 记录当前操作试了几次；Run State 记录整个任务执行到哪了。**
