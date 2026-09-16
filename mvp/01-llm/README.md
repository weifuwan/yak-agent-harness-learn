# 01 · LLM 学习

> 这一阶段不从“怎么设计一个成熟 LLM Runtime”开始，而是按 LLM 应用能力的演进顺序，一点一点增加问题和能力。

当前原则：**没有遇到问题之前，不提前引入答案。**

## 学习路线

```text
01 Basic Call
   ↓
02 Message Roles
   ↓
03 Multi-turn Messages
   ↓
04 Streaming
   ↓
05 Token / Context Window
   ↓
06 Provider Differences
   ↓
07 Unified LLM Interface
   ↓
08 Unified Stream Events
```

当前只学习前两个阶段。

```text
01 Basic Call       ← 当前基础
02 Message Roles    ← 当前基础
03～08              ← 暂时不展开
```

---

## 01 · Basic Call

核心问题：**一次最简单的大模型调用，到底发生了什么？**

先不要 System Prompt，不要 Stream，不要 Provider 抽象。

只有：

```text
User Prompt
    ↓
HTTP Request
    ↓
Model
    ↓
HTTP Response
    ↓
Assistant Text
```

学习目标：

- 看清一次真实的 HTTP 请求；
- 知道 `model` 和 `messages` 是什么；
- 知道用户输入如何进入 `messages`；
- 知道 Assistant 文本从响应的哪里取出来；
- 明白当前代码只是“一次模型调用”，还不是 Agent。

代码：[`01-basic-call/index.ts`](./01-basic-call/index.ts)

运行：

```bash
npm run llm:01 -- "用一句话解释 HashMap"
```

---

## 02 · Message Roles

核心问题：**为什么要把“你是谁”和“用户这次要什么”分开？**

在 01 的基础上只增加一个概念：`role`。

```text
System
“你是谁 / 你应该怎么回答”
        +
User
“这一次我要什么”
        ↓
      Model
        ↓
Assistant
“模型的回答”
```

学习目标：

- 理解 `system / user / assistant` 三种最基础角色；
- 理解 System Prompt 是行为约束，不是当前用户任务；
- 观察修改 System Prompt 后，同一个 User Prompt 的输出如何变化；
- 理解角色化消息为什么比把所有内容拼成一段字符串更容易管理。

代码：[`02-message-roles/index.ts`](./02-message-roles/index.ts)

运行：

```bash
npm run llm:02 -- "解释一下 HashMap"
```

可以直接修改代码里的 `SYSTEM_PROMPT`，例如从 Java 助手改成“面向初学者的老师”，观察同一个 User Prompt 的差异。

---

## 暂时不要学的东西

下面这些都已经存在于成熟 LLM / Agent 系统里，但现在先不碰：

```text
Multi-turn      ❌
Streaming       ❌
Token Budget    ❌
Provider 抽象   ❌
LLM class       ❌
LLMEvent        ❌
Tool            ❌
Agent Loop      ❌
Session         ❌
Context         ❌
```

仓库里之前已经实现过一版 `src/` 下的 Stream / Provider / LLMEvent 实验代码。它先保留，作为后面学习 04 / 06 / 07 / 08 时的对照材料，**当前阶段不要以它作为学习入口。**

---

## 当前 Done 标准

### 01 Basic Call

- [ ] 我能解释一次请求发送了什么。
- [ ] 我能找到 User Prompt 在请求 JSON 中的位置。
- [ ] 我能找到 Assistant Text 在响应 JSON 中的位置。
- [ ] 我知道这还不是 Agent。

### 02 Message Roles

- [ ] 我能解释 System Prompt 和 User Prompt 的区别。
- [ ] 我能解释 `system / user / assistant` 三种角色。
- [ ] 我实际修改过 System Prompt，并观察输出变化。
- [ ] 我理解为什么角色信息和任务信息要分开。

等这两个问题真正熟悉以后，再进入 **03 Multi-turn Messages**。
