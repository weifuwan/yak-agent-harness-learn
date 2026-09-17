# Integration 01 · Agent Skeleton

> 核心问题：**8 个 MVP 都分别理解以后，第一步怎么把它们真正接成一条 Agent 主链？**

运行：

```bash
npm run integration:01
```

---

## 这一轮只接什么？

只接：

```text
User Prompt
↓
MiniCodingAgent
↓
Context Runtime
↓
LLM Provider
↓
Answer
```

暂时不接：

```text
Tool
Agent Loop
Session Persistence
Compaction
Permission
Recovery
```

不是因为这些不重要，而是因为 Integration 仍然坚持：

> **一次只接一层，先验证边界，再继续增加复杂度。**

---

## 第一次出现 MiniCodingAgent

公开入口：

```ts
const agent = createMiniCodingAgent({
  llm,
  systemPrompt,
  projectContext,
})

const result = await agent.run({
  prompt,
})
```

调用方不再自己做：

```text
prepareContext()
构造 LLMRequest
provider.chat()
```

这些编排开始收进 Agent。

---

## Agent 内部做什么？

```text
prompt
↓
prepareContext()
↓
ModelContext
↓
toLLMRequest()
↓
Provider.chat()
↓
answer
```

所以这一轮真正验证：

> **Agent Runtime 的第一层职责，是把已经独立存在的能力编排成一个稳定入口。**

---

## 为什么还不能叫完整 Coding Agent？

因为它没有 Tool。

它不能：

```text
read_file
write_file
run_test
```

只能根据：

```text
System Prompt
Project Context
Current Task
```

回答。

为了把边界固定下来，`integration:01` 如果遇到 `tool` 消息或 assistant tool call，会直接报错。

也就是说：

> **没有接入 Tool 之前，不假装拥有 Tool 能力。**

---

## 默认实验

Project Context 注入：

```text
project: yak-agent-harness-learn
runtime: Node >=22
language: TypeScript
runner: tsx
stage: integration:01 Agent Skeleton
```

默认问题：

```text
当前这个学习项目使用什么运行时、语言和执行器？
```

所以可以观察：

```text
User
↓
Agent
↓
Context Runtime 把 Project Context 放进模型输入
↓
LLM
↓
Answer
```

---

## 这一轮记成

```text
01 = Skeleton
```

一句话：

> **Integration 01 先搭出 Agent 的骨架入口：User → Agent → Context → LLM → Answer。**

---

## 当前仍然不进入

```text
read_file
write_file
run_test
Tool Call
Multi-Step Loop
Permission
Recovery
Session Persistence
Compaction
```

下一步：

```text
integration:02 · Read → Think → Answer
```

第一次把 `read_file` 接进 Agent，让它真正读取项目文件，而不是只依赖预先注入的 Project Context。
