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
01 No Recovery                 ← 当前
02 Retry                       ← 后续
03 Run State                   ← 后续
04 Checkpoint / Snapshot       ← 后续
05 Resume / Rollback           ← 后续
06 Minimal Recovery Runtime    ← 后续
```

---

# 01 · No Recovery

核心问题：

> **Agent 执行到一半失败，但没有任何 Recovery 能力，会发生什么？**

运行：

```bash
npm run recovery:01
```

当前故意只有：

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

默认实验：

```text
Step 1 · write A  ✅
Step 2 · write B  ✅
Step 3 · fail     ❌
```

失败以后：

```text
A / B 的副作用已经存在

recovery state = NONE
resume point   = UNKNOWN
```

然后故意用最天真的办法：

```text
不知道从哪继续
↓
从 Step 1 整段重跑
```

结果：

```text
A 写入 2 次
B 写入 2 次
Step 3 再次失败
```

这轮真正看到：

> **没有 Recovery 时，失败不仅会终止 Run，盲目重跑还可能重复已经成功的副作用。**

```text
01 = Failure
```

详细：[`01-no-recovery/README.md`](./01-no-recovery/README.md)

---

## 为什么下一步是 Retry？

现在任何失败都会直接终止 Run。

但有些失败可能只是临时问题：

```text
timeout
临时网络错误
服务短暂不可用
```

所以自然出现第一个问题：

> **同一步失败以后，能不能再试一次？**

下一轮进入：

```text
recovery:02 · Retry
```

这一轮暂时不提前进入：

```text
Run State
Checkpoint
Resume
Rollback
事务
Saga
```

---

## 当前 Done 标准

### Recovery 01

- [ ] 我知道 Recovery 解决的是失败以后怎么办。
- [ ] 我知道失败时已经成功的副作用不会自动消失。
- [ ] 我知道没有 Run State 时无法可靠判断哪些 Step 已经成功。
- [ ] 我知道没有 Resume Point 时整段重跑可能重复副作用。
- [ ] 我知道 Session 不等于 Recovery。
- [ ] 我知道这一轮为什么先只暴露 Failure。
- [ ] 我知道下一步为什么先从 Retry 开始。

做到这些，就进入 **recovery:02 · Retry**。
