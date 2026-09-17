# Yak Agent Harness Learn

> 用 OpenCode 等成熟开源项目学习 Agent Engineering：先理解问题，再做最小实现，最后回到源码验证理解。

这个仓库不是为了快速做出一个 Agent Demo，也不是 Yakable 的开发分支。

它只做一件事：**把 Agent Engineering 拆成一个个可以真正理解、亲手验证的节点。**

---

## 学习原则

每个节点都固定走：

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

## 第一阶段 · Core MVP

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

## 第二阶段 · Integration · Mini Coding Agent

学习问题：**已经分别理解的能力，怎样真正组合成一个 Coding Agent？**

学习路线：

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

当前目录：

```text
integration/
├── 01-agent-skeleton/
├── 02-read-think-answer/
├── 03-read-edit-permission-write/
├── 04-multi-step-coding-loop/
├── 05-session-context-recovery/
└── src/
```

---

## 当前主链

```text
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

Recovery 现在分成两个方向：

```text
Resume
= 保留原 CodingLoopState，从停下的位置继续

Rollback
= 使用 Run 开始前的 Checkpoint 恢复工作区
```

只有完整 `Done` Run 才会写回 Session。

所以 Session 保持：

> **完整事实边界，而不是半截执行日志。**

详细：[`integration/README.md`](./integration/README.md)

---

## 当前进度

```text
[x] Integration 01 · Agent Skeleton
[x] Integration 02 · Read → Think → Answer
[x] Integration 03 · Read → Edit → Permission → Write
[x] Integration 04 · Multi-Step Coding Loop
[>] Integration 05 · Session / Context / Recovery
[ ] Integration 06 · Minimal Coding Agent Runtime
```

当前进入 **Integration 05 · Session / Context / Recovery**。

下一步不再增加新能力，而是最终收口：

```text
createMiniCodingAgent(...)
↓
agent.run(...)
```

> 不是为了更快写出 Agent，而是为了真正知道 Agent 为什么这样工作。
