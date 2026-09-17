# Yak Agent Harness Learn

> 用成熟 Agent 项目学习 Agent Engineering：先理解问题，再做最小实现，最后回到源码验证理解。

这个仓库不是为了快速做出一个 Agent Demo。

它只做一件事：**把 Agent Engineering 拆成可以真正理解、亲手验证的节点，再把它们重新组合起来。**

---

## 学习原则

```text
理解问题
↓
建立边界
↓
做最小实现
↓
验证
↓
再看成熟实现
↓
理解复杂度为什么出现
```

没有先撞到问题，就不提前引入答案。

---

# 第一阶段 · Core MVP · COMPLETE

```text
[x] 01 LLM
[x] 02 Tool
[x] 03 Agent Loop
[x] 04 Session
[x] 05 Context
[x] 06 Compaction
[x] 07 Permission
[x] 08 Recovery
```

核心边界：

```text
LLM        → Provider / Request / Stream
Tool       → Capability / Call / Execution / Result
Agent Loop → Continue / Stop / maxSteps
Session    → 完整历史 / Persistence / Resume
Context    → 本轮模型到底看到什么
Compaction → Selection 后仍太长怎么办
Permission → Tool Call 到 Execution 之间的最终执行权
Recovery   → Retry / State / Checkpoint / Resume / Rollback
```

---

# 第二阶段 · Integration · Mini Coding Agent · COMPLETE

```text
[x] 01 Agent Skeleton
[x] 02 Read → Think → Answer
[x] 03 Read → Edit → Permission → Write
[x] 04 Multi-Step Coding Loop
[x] 05 Session / Context / Recovery
[x] 06 Minimal Coding Agent Runtime
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

目录：

```text
integration/
├── 01-agent-skeleton/
├── 02-read-think-answer/
├── 03-read-edit-permission-write/
├── 04-multi-step-coding-loop/
├── 05-session-context-recovery/
├── 06-minimal-coding-agent-runtime/
└── src/
```

详细：[`integration/README.md`](./integration/README.md)

---

## 最终主链

```text
User Prompt
↓
MiniCodingAgentRuntime
↓
Session
↓
Context Runtime
↓
Compaction Runtime
↓
LLM
↓
Tool Batch ?
├── read_file
├── write_file → Permission Runtime
├── run_test
└── no tool → final answer
↓
Tool Results
↓
CodingLoopState
↓
Continue / Done / Recovery Required
```

Recovery：

```text
Resume
= 保留原 CodingLoopState，从停下的位置继续

Rollback
= 使用 Run 开始前的 Checkpoint 恢复工作区
```

Session：

```text
只有完整 Done Run 才 Commit
```

所以它保存的是：

> **完整事实边界，而不是半截执行日志。**

---

## 最终 Runtime API

```ts
const agent = createMiniCodingAgentRuntime({
  llm,
  workspaceRoot,
  snapshotFiles,
  compaction,
})

let result = await agent.run({
  sessionId,
  prompt,
})
```

调用方不再自己创建：

```text
Tools
Permission Runtime
Session Store
Coding Loop
Continuity Agent
```

Runtime 统一装配这些内部能力。

但以下决定仍然显式保留给外部：

```text
resumeApproval()
resumeRecovery()
rollback()
```

因为：

> **封装复杂度，不等于替用户做授权和恢复决策。**

---

## 当前阶段

第一阶段 Core MVP：`8 / 8 COMPLETE`

第二阶段 Integration：`6 / 6 COMPLETE`

下一步不再继续堆新的最小模块。

更适合进入：

```text
自己的 Mini Coding Agent
↓
对照 OpenCode 等成熟实现
↓
解释成熟工程为什么多出那些复杂度
↓
把真正需要的能力带回 Yakable
```

> **把确定性交给 Harness，把不确定性交给 Agent。**
