# Integration · Mini Coding Agent

> 核心问题：**前面 8 个能力都单独理解以后，怎么一步步把它们组合成一个真正能工作的 Coding Agent？**

当前状态：`LEARNING`

Integration 仍然沿用同一个原则：

```text
理解一个组合问题
↓
只接必要模块
↓
验证边界
↓
封板
↓
再接下一层
```

---

## 学习路线

```text
01 Agent Skeleton
   ↓
02 Read → Think → Answer
   ↓
03 Read → Edit → Permission → Write
   ↓
04 Multi-Step Coding Loop
   ↓
05 Session / Context / Recovery
   ↓
06 Minimal Coding Agent Runtime
```

当前进度：

```text
01 Agent Skeleton                    ✅
02 Read → Think → Answer             ✅
03 Read → Edit → Permission → Write  ✅
04 Multi-Step Coding Loop            ✅
05 Session / Context / Recovery      ← 当前
06 Minimal Coding Agent Runtime      ← 后续
```

---

# 01 · Agent Skeleton

```bash
npm run integration:01
```

第一次形成统一 Agent 入口：

```text
User → Context Runtime → LLM → Answer
```

```text
01 = Skeleton
```

详细：[`01-agent-skeleton/README.md`](./01-agent-skeleton/README.md)

---

# 02 · Read → Think → Answer

```bash
npm run integration:02
```

第一次让 Agent 主动读取真实项目文件：

```text
LLM → read_file → Tool Result → LLM → Answer
```

```text
02 = Inspect
```

详细：[`02-read-think-answer/README.md`](./02-read-think-answer/README.md)

---

# 03 · Read → Edit → Permission → Write

```bash
npm run integration:03
```

第一次安全地产生文件副作用：

```text
read_file
↓
LLM
↓
write_file Tool Call
↓
Permission Runtime
↓
approve / reject
↓
真正写入 / 不写入
```

```text
03 = Edit
```

详细：[`03-read-edit-permission-write/README.md`](./03-read-edit-permission-write/README.md)

---

# 04 · Multi-Step Coding Loop

```bash
npm run integration:04
```

把固定流程改成真正循环：

```text
LLM
↓
Tool Batch ?
├── read_file
├── write_file → Permission
├── run_test
└── no tool → final answer
↓
Tool Results
↓
LLM
↓
Continue / Done
```

Runtime 维护：

```text
CodingLoopState
├── step
├── maxSteps
├── messages
└── trace
```

一个 Model Turn 可以返回 `0..N` 个 Tool Call；当前学习版按顺序处理这一批，并确保每个 Tool Call 都有对应 Tool Result 后才进入下一次模型调用。

```text
04 = Loop
```

详细：[`04-multi-step-coding-loop/README.md`](./04-multi-step-coding-loop/README.md)

---

# 05 · Session / Context / Recovery

核心问题：

> **一个 Run 已经能动态完成 Coding 任务以后，多个 Run 怎么连续？执行停在半路以后怎么继续或回退？**

运行：

```bash
npm run integration:05
```

这一轮把主链扩展成：

```text
Session
↓
Context Runtime
↓
Compaction Runtime
↓
Coding Loop
↓
Permission Runtime
↓
Recovery Boundary
↓
Done 后 Commit Session
```

### Session / Context

```text
Session
= 完整保存已经完成的历史

Context
= 当前 Run 实际发送给模型的历史
```

所以第二轮用户只说：

```text
“刚才那个文件里的 port 当前是多少？”
```

Agent 会从同一 Session 的历史中理解指代，再通过 `read_file` 获取真实状态。

### Compaction

位置：

```text
Session
↓
Context Selection
↓
Compaction
↓
Coding Loop
```

Context 在预算内时原样使用；超预算时才压缩 Cold History。

### Session Commit Boundary

只有完整：

```text
status = done
```

才把本次：

```text
user
assistant(tool_call)
tool(result)
...
assistant(final)
```

写回 Session。

`approval_required` / `recovery_required` 都不会提前写入，避免半截 Tool Unit 污染下一轮 Context。

### Recovery

这里暴露了 Integration 的一个真实边界：

```text
Recovery MVP
= 静态 Step 列表

Coding Agent
= Tool Step 运行时由 LLM 动态产生
```

所以不能把整个 Coding Loop 粗暴当成一个静态 Recovery Step，否则 Resume 会整段重跑并可能重复副作用。

这一轮组合：

```text
Checkpoint / Rollback
= 恢复世界状态

CodingLoopState / Resume
= 从原执行位置继续
```

确定性 Demo 会故意让：

```text
read_file ✅
write_file ✅
run_test 尚未执行
maxSteps 到达
```

然后分别验证：

```text
Resume
→ 继续 pending run_test
→ write_file 不重复

Rollback
→ 文件恢复到 Checkpoint
→ 未完成 Run 不写入 Session
```

```text
05 = Continuity
```

详细：[`05-session-context-recovery/README.md`](./05-session-context-recovery/README.md)

---

## 为什么下一步只剩 Minimal Coding Agent Runtime？

现在所有核心能力已经真正进入同一条工作链：

```text
LLM
Tool
Agent Loop
Session
Context
Compaction
Permission
Recovery
```

但调用方仍然需要自己创建很多对象：

```text
Provider
Tools
Permission Runtime
Session Store
Coding Loop
Continuity Agent
```

所以下一轮不再学习新能力，而是最后一次收口：

```text
integration:06 · Minimal Coding Agent Runtime
```

最终希望调用方只看到类似：

```ts
const agent = createMiniCodingAgent(...)
await agent.run(...)
```

---

## 当前 Done 标准

### Integration 05

- [ ] 我能解释 Session 和 Context 的区别。
- [ ] 我知道为什么只有完整 Done Run 才写回 Session。
- [ ] 我知道 Context Selection 和 Compaction 的先后关系。
- [ ] 我知道“刚才那个”依赖 Session，不是模型自己记得。
- [ ] 我知道静态 Recovery Step 和动态 Tool Loop 的边界。
- [ ] 我知道 Checkpoint 负责回退世界，CodingLoopState 负责继续执行。
- [ ] 我知道 Resume 为什么不能重复已经成功的副作用。
- [ ] 我知道 Rollback 后未完成 Run 不应该污染 Session。
- [ ] 我知道 `01 = Skeleton`、`02 = Inspect`、`03 = Edit`、`04 = Loop`、`05 = Continuity`。
- [ ] 我知道下一步为什么只需要最终 Runtime 收口。
