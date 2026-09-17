# Yak Agent Harness Learn

> 用 OpenCode 等成熟开源项目学习 Agent Engineering：先理解问题，再做最小实现，最后回到源码验证理解。

这个仓库不是为了快速做出一个 Agent Demo，也不是 Yakable 的开发分支。

它只做一件事：**把 Agent Engineering 拆成一个个可以真正理解、亲手验证的节点。**

学习对象会以 [OpenCode](https://github.com/anomalyco/opencode) 为主，但目标不是“读懂 OpenCode 的所有代码”，而是借成熟实现理解 Agent 系统为什么需要这些能力、每个能力解决什么问题，以及工程复杂度是怎么一步步产生的。

---

## 学习原则

不从源码第一行开始看。

每个节点都固定走下面这条路径：

```text
① 它处在整个流程什么位置？
        ↓
② 如果没有它，会出现什么问题？
        ↓
③ OpenCode 用什么思路解决？
        ↓
④ 暂时不看源码，自己设计一个最小方案
        ↓
⑤ 做一个 100～300 行左右的 MVP
        ↓
⑥ 跑几个场景，看自己的理解对不对
        ↓
⑦ 再回头进入 OpenCode 源码
        ↓
⑧ 对比：我的方案 vs OpenCode
        ↓
⑨ 总结它为什么比我的 MVP 多那些复杂度
```

核心不是“抄一个成熟实现”，而是：

```text
问题
↓
约束
↓
自己的最小设计
↓
亲手验证
↓
成熟项目实现
↓
理解工程复杂度从哪里来
```

如果没有先撞到问题，就暂时不要提前引入答案。

---

## 学习地图

第一阶段拆 8 个核心节点：

```text
LLM MVP
   +
Tool MVP
   +
Agent Loop MVP
   +
Session MVP
   +
Context MVP
   +
Compaction MVP
   +
Permission MVP
   +
Recovery MVP
```

目录：

```text
mvp/
├── 01-llm/
├── 02-tool/
├── 03-agent-loop/
├── 04-session/
├── 05-context/
├── 06-compaction/
├── 07-permission/
└── 08-recovery/
```

第一阶段 8 个核心节点已经完成最小实现与验证。

第二阶段进入 Integration，把这些已经理解的模块真正组合成一个 Mini Coding Agent：

```text
integration/
├── 01-agent-skeleton/
├── 02-read-think-answer/
├── 03-read-edit-permission-write/
├── 04-multi-step-coding-loop/
└── src/
```

Mini Coding Agent 跑通以后，再回到 Yakable：

```text
Agent Engineering 基础
        +
Frontend Domain Harness
        +
Yakable 产品能力
```

---

## 第一阶段核心节点

```text
01 LLM        → Provider / Request / Stream / Unified Interface
02 Tool       → Tool Definition / Call / Execution / Result
03 Agent Loop → Continue / Stop / maxSteps / Runtime State
04 Session    → History / Persistence / Resume
05 Context    → 本轮模型到底看到什么
06 Compaction → Trigger / Hot-Cold / Summary / Rebuild
07 Permission → allow / ask / deny / Scope / Policy
08 Recovery   → Retry / State / Checkpoint / Resume / Rollback
```

---

## Integration · Mini Coding Agent

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

当前主链已经变成：

```text
User Prompt
↓
Context Runtime
↓
LLM
↓
Tool Call ?
├── read_file
├── write_file → Permission Runtime
├── run_test
└── no tool → final answer
↓
Tool Result
↓
LLM
↓
Continue / Done
```

Runtime 同时维护：

```text
Loop State
maxSteps
Permission boundary
workspace boundary
```

详细：[`integration/README.md`](./integration/README.md)

---

## Done 标准

一个节点不是“代码能跑”就算完成。

至少满足：

- 我能不用看源码解释这个节点为什么存在。
- 我能画出它在完整 Agent 流程里的输入和输出。
- 我能写一个最小版本验证自己的理解。
- 我能说明自己的 MVP 有哪些明确缺陷。
- 我能重新看 OpenCode，并解释成熟实现为什么多出那些复杂度。
- 我能判断哪些复杂度当前值得学，哪些只是产品规模带来的工程需求。

做不到这些，就继续留在当前节点，不进入下一关。

---

## 当前进度

第一阶段：

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

第二阶段：

```text
[x] Integration 01 · Agent Skeleton
[x] Integration 02 · Read → Think → Answer
[x] Integration 03 · Read → Edit → Permission → Write
[>] Integration 04 · Multi-Step Coding Loop
[ ] Integration 05 · Session / Context / Recovery
[ ] Integration 06 · Minimal Coding Agent Runtime
```

当前进入 **Integration 04 · Multi-Step Coding Loop**。

> 不是为了更快写出 Agent，而是为了真正知道 Agent 为什么这样工作。
