# Integration 05 · Session / Context / Recovery

> 核心问题：**一次 Run 已经像 Coding Agent 了，但多个 Run 怎么连续？半路停下以后怎么继续或回退？**

运行：

```bash
npm run integration:05
```

---

## 04 解决了什么？

`integration:04` 已经有真正的 Coding Loop：

```text
LLM
↓
Tool Batch
↓
Observation
↓
LLM
↓
Continue / Done
```

但它主要解决的是：

```text
一个 Run 内怎么动态执行
```

还没有完整解决：

```text
Run 1 和 Run 2 怎么连续？
哪些历史应该进入下一轮 Context？
Context 太长怎么办？
Run 已经产生部分副作用以后停了怎么办？
```

---

## 05 的完整位置

```text
Session
保存完整已完成历史
↓
Context Runtime
选择这一轮应该看到什么
↓
Compaction Runtime
必要时压缩 Cold History
↓
Coding Loop
动态 read / write / test
↓
Permission Runtime
控制副作用
↓
Recovery Boundary
Resume / Rollback
↓
Done 后才写回 Session
```

这一轮记成：

```text
05 = Continuity
```

这里的 Continuity 有两个方向：

```text
对话连续
+
执行连续
```

---

## Session 和 Context 再区分一次

```text
Session
= 完整保存已经发生过什么

Context
= 当前这一轮实际发给模型什么
```

所以仍然是那句话：

> **完整保存，不等于全部发送。**

默认 Case A：

```text
Run 1
“把 config.ts 的 port 改成 8080”
↓
完成
↓
完整 user / assistant / tool 历史写入 Session
```

Run 2 用户不再重复文件名：

```text
“刚才那个文件里的 port 当前是多少？”
```

流程：

```text
同一个 Session
↓
prepareContext()
↓
选中上一轮历史
↓
模型理解“刚才那个”
↓
read_file(config.ts)
↓
回答 8080
```

---

## 为什么只有 Done 才写回 Session？

Tool 协议要求：

```text
assistant(tool_call)
↓
tool(result)
```

必须成对。

如果在：

```text
approval_required
max_steps
```

时就把半截历史写回 Session，下一轮 Context 可能得到：

```text
assistant(tool_call)
但没有 tool(result)
```

这会制造 orphan / incomplete Tool Unit。

所以这一轮规定：

```text
Done
→ Commit Session

Approval Required / Recovery Required
→ 暂不 Commit
```

Session 因而成为：

> **已完成事实边界。**

---

## Compaction 放在哪里？

位置是：

```text
Session
↓
Context Selection
↓
Compaction
↓
Coding Loop
```

也就是说：

```text
Selection
= 先决定选哪些历史

Compaction
= 选出来以后仍然太长，再压缩
```

默认 Demo 的预算足够，所以正常路径通常显示：

```text
compacted = false
```

但 Runtime 已经真正接入；当 Context 超预算时会使用前面学过的 Cold Summary + Hot Units 重建模型输入。

---

## Recovery 为什么不能硬套静态 RecoveryStep[]？

Recovery MVP 使用：

```text
Step 1
Step 2
Step 3
```

这些 Step 是运行前就知道的。

但 Coding Agent 的 Tool 序列是：

```text
LLM 运行以后
才知道下一步是 read / write / test
```

所以如果把整个 Coding Loop 当成一个静态 Recovery Step：

```text
失败
↓
resume()
↓
整段 Coding Loop 重跑
```

就可能重复已经完成的 `write_file`。

Integration 05 因此组合：

```text
Checkpoint / Rollback
来自 Recovery MVP

CodingLoopState / Resume
来自活着的动态 Agent Loop
```

边界变成：

```text
Checkpoint
= 世界怎么回去

CodingLoopState
= 执行怎么继续往前
```

---

## Resume Demo

确定性 Recovery Case 会故意设置：

```text
maxSteps = 3
```

执行到：

```text
Turn 1 → read_file ✅
Turn 2 → write_file ✅
Turn 3 → 模型提出 run_test
          但 maxSteps 到达
          run_test 尚未执行
```

此时：

```text
config.ts 已经是 9999
Session 仍然是 0 条新消息
```

调用：

```text
resumeRecovery(+2 steps)
```

不会从 read / write 重跑，而是：

```text
继续 pending run_test
↓
TEST_PASSED
↓
模型 Final Answer
↓
Done
↓
Commit Session
```

Demo 会验证：

```text
write_file 次数仍然 = 1
```

---

## Rollback Demo

同样先让：

```text
3000
↓
write_file
↓
9999
↓
maxSteps 停下
```

然后：

```text
rollback()
↓
Checkpoint
↓
恢复 3000
```

并且：

```text
Session 仍然没有写入这个未完成 Run
```

所以：

> **Rollback 恢复工作区；Session 保留上一个完整事实边界。**

---

## 五轮连起来

```text
01 = Skeleton
02 = Inspect
03 = Edit
04 = Loop
05 = Continuity
```

---

## 当前明确不做

```text
Session 磁盘持久化接入完整 Agent
进程重启后的 Pending Run 恢复
Git Checkpoint
任意 Shell
Sub Agent
自动 Recovery 策略
完整产品级事务 / Saga
```

这些不是这一轮的问题。

---

## Done 标准

- [ ] 我能解释 Session 和 Context 的区别。
- [ ] 我知道为什么只有完整 Done Run 才应该写回 Session。
- [ ] 我知道 Context Selection 后面为什么还可能需要 Compaction。
- [ ] 我知道“刚才那个”为什么依赖 Session，而不是依赖模型自己记忆。
- [ ] 我知道静态 RecoveryStep[] 为什么不能直接代表动态 Tool Loop。
- [ ] 我知道 Checkpoint 负责回退世界，CodingLoopState 负责继续执行。
- [ ] 我知道 Resume 为什么不能重复已经成功的 write_file。
- [ ] 我知道 Rollback 后未完成 Run 不应该污染 Session。
- [ ] 我知道 `01 = Skeleton`、`02 = Inspect`、`03 = Edit`、`04 = Loop`、`05 = Continuity`。
- [ ] 我知道下一步为什么只剩最终 Runtime 收口。
