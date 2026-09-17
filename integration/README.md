# Integration · Mini Coding Agent

> 核心问题：**前面 8 个能力都单独理解以后，怎么一步步把它们组合成一个真正能工作的 Coding Agent？**

当前状态：`COMPLETE`

---

## 学习路线

```text
01 Agent Skeleton                    ✅
02 Read → Think → Answer             ✅
03 Read → Edit → Permission → Write  ✅
04 Multi-Step Coding Loop            ✅
05 Session / Context / Recovery      ✅
06 Minimal Coding Agent Runtime      ✅
```

记忆方式：

```text
01 = Skeleton
02 = Inspect
03 = Edit
04 = Loop
05 = Continuity
06 = Runtime
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
write_file Tool Call
↓
Permission Runtime
↓
approve / reject
↓
真正写入 / 不写入
```

详细：[`03-read-edit-permission-write/README.md`](./03-read-edit-permission-write/README.md)

---

# 04 · Multi-Step Coding Loop

```bash
npm run integration:04
```

把固定流程升级成：

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
Continue / Done
```

一个 Model Turn 可以返回 `0..N` 个 Tool Call；Runtime 按顺序处理，并保证每个 Tool Call 都有对应 Tool Result 后才进入下一次模型调用。

详细：[`04-multi-step-coding-loop/README.md`](./04-multi-step-coding-loop/README.md)

---

# 05 · Session / Context / Recovery

```bash
npm run integration:05
```

把单次 Coding Loop 扩展成连续 Agent：

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

关键边界：

```text
Session
= 完整已完成历史

Context
= 当前 Run 实际发送给模型的历史

Checkpoint
= 世界怎么恢复

CodingLoopState
= 执行从哪里继续
```

只有完整 `done` Run 才写回 Session；不完整 Run 可以 Resume 或 Rollback，不会把半截 Tool Unit 提前写进历史。

详细：[`05-session-context-recovery/README.md`](./05-session-context-recovery/README.md)

---

# 06 · Minimal Coding Agent Runtime

```bash
npm run integration:06
```

这一轮不新增能力，只做最终收口。

调用方从原来的：

```text
create tools
create permission runtime
create session store
create coding loop
create continuity agent
```

变成：

```ts
const agent = createMiniCodingAgentRuntime({
  llm,
  workspaceRoot,
  snapshotFiles,
  compaction,
})

await agent.run({
  sessionId,
  prompt,
})
```

Runtime 内部负责装配：

```text
LLM Provider
Tools
Permission Runtime
Session Store
Context Runtime
Compaction Runtime
Coding Loop
Checkpoint / Recovery
```

公开边界只保留：

```text
run()
resumeApproval()
resumeRecovery()
rollback()
getSession()
```

`approval / recovery` 仍然是外部决定；Runtime 负责机制，不替用户做授权决策。

详细：[`06-minimal-coding-agent-runtime/README.md`](./06-minimal-coding-agent-runtime/README.md)

---

## 最终结构

```text
MiniCodingAgentRuntime
│
├── LLM Provider
├── Tool Registry
│   ├── read_file
│   ├── write_file
│   └── run_test
├── Permission Runtime
├── Session Store
├── Context Runtime
├── Compaction Runtime
├── Coding Loop
└── Recovery / Checkpoint
```

最重要的一句话：

> **Runtime 的价值不是增加能力，而是把已经理解的能力装配成一个稳定、可复用、对调用方简单的边界。**

到这里，**Integration · Mini Coding Agent COMPLETE**。
