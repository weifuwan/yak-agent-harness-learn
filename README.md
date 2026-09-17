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

第一阶段只拆 8 个核心节点。

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

下一步不再继续堆单点能力，而是进入 Integration 阶段，把这些已经理解的模块真正组合成一个 Mini Coding Agent。

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

先理解：

- LLM 和 Agent 有什么区别？
- Provider 是什么？
- 一次 Model Request 的输入到底有哪些？
- 为什么 Coding Agent 更适合使用 Stream，而不是一次返回完整字符串？
- 为什么要把 Provider 的响应转换成统一的内部事件？
- 为什么 Provider SDK 不应该泄漏到 Agent 上层？

MVP 暂时只做：

```text
User
 ↓
LLM.stream()
 ↓
One Provider
 ↓
Streaming Response
 ↓
LLMEvent
 ↓
Console
```

暂时不做 Tool、Agent Loop、Session、Context、Memory、Compaction、Permission。

---

## 02 · Tool MVP

学习问题：**模型怎样从“会说”变成“能做”？**

重点理解 Tool Definition、Tool Call、参数校验、Tool Execution、Tool Result，以及 Tool Result 为什么必须重新回到模型。

MVP 只准备少量工具，例如：

```text
read_file(path)
write_file(path, content)
```

---

## 03 · Agent Loop MVP

学习问题：**为什么一次模型调用不能完成一个 Coding Agent 任务？**

从最小循环开始理解：

```text
Model
 ↓
Action / Tool Call
 ↓
Execute
 ↓
Observation
 ↓
Model
 ↓
Continue / Done
```

重点研究 Continue、Stop、Tool Result、最大步数以及异常退出。

---

## 04 · Session MVP

学习问题：**为什么 Agent 不能只存在于一个 `while` 循环里？**

重点研究消息、Tool Call、执行状态如何持久化，以及程序中断、重新启动后还能知道“之前发生了什么”。

---

## 05 · Context MVP

学习问题：**这一轮模型到底应该知道什么？**

重点区分：

```text
完整持久化状态
≠
本轮 Model Context
```

研究 System、Task、Conversation、Project、Tool Result 等信息如何进入一次模型调用，以及如何控制噪音和 Token。

---

## 06 · Compaction MVP

学习问题：**Context 越来越长以后怎么办？**

先自己实现一个非常简单、甚至并不完美的压缩方案，再研究 OpenCode 的 overflow / compaction 为什么会复杂得多。

---

## 07 · Permission MVP

学习问题：**Agent 会调用工具以后，为什么不能让它想做什么就做什么？**

重点研究 allow / ask / deny、工具权限、目录边界、危险操作以及 Agent 能力差异。

---

## 08 · Recovery MVP

学习问题：**模型失败、Tool 失败、进程退出、代码改坏以后怎么办？**

重点研究 Retry、Run State、Snapshot、Rollback、Resume，以及“恢复”为什么不能只靠重新执行一次 Prompt。

---

## 每个 MVP 的固定目录

每个节点保持相同结构：

```text
mvp/xx-name/
├── README.md      # 9 步学习记录，先写问题和设计，再写源码分析
├── src/           # 自己的 100～300 行最小实现
├── examples/      # 用来故意制造问题的场景
└── test/          # 验证理解的最小测试
```

每个节点的 README 都按同一模板维护：

```text
1. 流程位置
2. 没有它会发生什么
3. OpenCode 的解决思路
4. 我的最小设计
5. MVP 实现
6. 验证场景
7. OpenCode 源码入口
8. 我的 MVP vs OpenCode
9. 我学到了什么
```

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

**第一阶段 8 个核心 MVP 已全部完成。**

下一步：**Integration · Mini Coding Agent**。

> 不是为了更快写出 Agent，而是为了真正知道 Agent 为什么这样工作。
