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
⑧ 对比：
   我的方案 vs OpenCode
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

## 01 · LLM MVP

学习问题：**一次 Provider Turn 到底是什么？**

重点理解 Provider、Model Request、Streaming、统一 LLM Interface 和 Provider 差异。

---

## 02 · Tool MVP

学习问题：**模型怎样从“会说”变成“能做”？**

重点理解 Tool Definition、Tool Call、Tool Execution、Tool Result，以及 Tool Result 为什么必须重新回到模型。

---

## 03 · Agent Loop MVP

学习问题：**为什么一次模型调用不能完成一个 Coding Agent 任务？**

重点理解 Continue、Stop、Tool Result、最大步数以及 Runtime State。

---

## 04 · Session MVP

学习问题：**为什么 Agent 不能只存在于一个 `while` 循环里？**

重点研究消息、Tool Call、执行状态如何持久化，以及程序重新启动后怎样延续历史。

---

## 05 · Context MVP

学习问题：**这一轮模型到底应该知道什么？**

重点区分：

```text
完整持久化状态
≠
本轮 Model Context
```

---

## 06 · Compaction MVP

学习问题：**Context 越来越长以后怎么办？**

重点理解 Trigger、Hot / Cold、Summary、Rebuild 和 Compaction Runtime。

---

## 07 · Permission MVP

学习问题：**Agent 会调用工具以后，为什么不能让它想做什么就做什么？**

重点研究 allow / ask / deny、Resource Scope、Policy Precedence 和 Permission Runtime。

---

## 08 · Recovery MVP

学习问题：**模型失败、Tool 失败、进程退出、代码改坏以后怎么办？**

重点研究 Retry、Run State、Checkpoint、Resume、Rollback 和 Recovery Runtime。

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

当前主链：

```text
User Prompt
↓
Context Runtime
↓
Tool-capable LLM
↓
read_file
↓
Tool Result
↓
LLM
↓
Answer
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
[>] Integration 02 · Read → Think → Answer
[ ] Integration 03 · Read → Edit → Permission → Write
[ ] Integration 04 · Multi-Step Coding Loop
[ ] Integration 05 · Session / Context / Recovery
[ ] Integration 06 · Minimal Coding Agent Runtime
```

当前进入 **Integration 02 · Read → Think → Answer**。

> 不是为了更快写出 Agent，而是为了真正知道 Agent 为什么这样工作。
