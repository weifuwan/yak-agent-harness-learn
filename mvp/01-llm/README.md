# 01 · LLM 学习

> 这一阶段不从“怎么设计一个成熟 LLM Runtime”开始，而是按 LLM 应用能力的演进顺序，一点一点增加问题和能力。

当前原则：**没有遇到问题之前，不提前引入答案。**

## 快速测试

第一次运行：

```bash
npm install
cp .env.example .env
```

在 `.env` 中填写 `MODEL_API_KEY` 后，可以直接复制下面的命令测试。

### 01 Basic Call

```bash
npm run llm:01 -- "用一句话解释 HashMap"
```

### 02 Message Roles / Persona Comparison

```bash
npm run llm:02 -- "解释一下 HashMap"
```

同一个 User Prompt 会用 3 个不同 persona 运行，观察 System Prompt 对回答方式的影响。

### 03 Multi-turn Messages

```bash
npm run llm:03 -- "我叫什么？"
```

重点观察：第二轮不带历史和带 `user1 + assistant1` 历史时，模型回答有什么区别。

### 04 Streaming

```bash
npm run llm:04 -- "请详细解释 Java HashMap 的工作原理"
```

这条命令会用同一个 Prompt 做两次请求：

```text
A. stream:false
   → 等完整回答生成完，一次性拿到 message.content

B. stream:true
   → 连续收到多个 delta.content，再自己拼成完整回答
```

独立说明：[`04-streaming/README.md`](./04-streaming/README.md)

---

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

当前学习到：

```text
01 Basic Call          ✅
02 Message Roles       ✅
03 Multi-turn Messages ✅
04 Streaming           ← 当前
05～08                 ← 暂时不展开
```

---

# 01 · Basic Call

核心问题：**一次最简单的大模型调用，到底发生了什么？**

先不要 System Prompt，不要 Stream，不要 Provider 抽象。

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
- 看懂完整 Provider Response；
- 知道 Assistant 文本来自 `payload.choices[0].message.content`；
- 明白当前代码只是“一次模型调用”，还不是 Agent。

代码：[`01-basic-call/index.ts`](./01-basic-call/index.ts)

运行：

```bash
npm run llm:01 -- "用一句话解释 HashMap"
```

---

# 02 · Message Roles

核心问题：**为什么要把“你是谁”和“用户这次要什么”分开？**

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

需要区分：

```text
system / user / assistant
= 消息角色（message role）

Java 工程师 / 初学者老师 / 面试官
= System Prompt 定义的人设（persona）
```

代码：[`02-message-roles/index.ts`](./02-message-roles/index.ts)

运行：

```bash
npm run llm:02 -- "解释一下 HashMap"
```

这一阶段重点理解：

```text
User 决定“问什么”
System 影响“以什么身份、方式和重点回答”
Assistant 是模型生成的回答
```

---

# 03 · Multi-turn Messages

核心问题：**模型为什么看起来能记住上一轮？**

最基础的答案不是“模型自动记住了”，而是：

> **应用在下一次请求时，把之前的 user / assistant 消息重新放进 `messages` 发送给模型。**

```text
第一轮：
System + User 1
↓
Assistant 1

第二轮：
System + User 1 + Assistant 1 + User 2
↓
Assistant 2
```

所以最基础的多轮 History 是：

```text
user
assistant
user
assistant
user
assistant
...
```

代码：[`03-multi-turn/index.ts`](./03-multi-turn/index.ts)

运行：

```bash
npm run llm:03 -- "我叫什么？"
```

独立说明：[`03-multi-turn/README.md`](./03-multi-turn/README.md)

---

# 04 · Streaming

核心问题：**模型回答比较慢时，能不能生成一点，就先返回一点？**

03 以前：

```text
stream:false
↓
模型生成完整答案
↓
一次性得到 message.content
```

04：

```text
stream:true
↓
delta 1
↓
delta 2
↓
delta 3
↓
...
↓
应用把所有 delta.content 拼起来
```

最重要的区别：

```text
非流式：choices[0].message.content
流式：  choices[0].delta.content
```

运行：

```bash
npm run llm:04 -- "请详细解释 Java HashMap 的工作原理"
```

代码：[`04-streaming/index.ts`](./04-streaming/index.ts)

详细说明：[`04-streaming/README.md`](./04-streaming/README.md)

当前只需要理解：

```text
stream:false → 完整结果一次性返回
stream:true  → 连续收到很多小 delta
完整 Assistant = 所有 delta 按顺序拼起来
```

暂时不要引入：

```text
Provider 抽象     ❌
LLMEvent          ❌
Adapter           ❌
Abort             ❌
Retry             ❌
```

---

## 当前 Done 标准

### 01 Basic Call

- [ ] 我能解释一次请求发送了什么。
- [ ] 我能找到 User Prompt 在请求 JSON 中的位置。
- [ ] 我能从 `payload → choices[0] → message → content` 找到最终回答。
- [ ] 我知道这还不是 Agent。

### 02 Message Roles

- [ ] 我能解释 System Prompt 和 User Prompt 的区别。
- [ ] 我能解释 `system / user / assistant` 三种消息角色。
- [ ] 我能区分 message role 和 persona。
- [ ] 我理解为什么角色信息和任务信息要分开。

### 03 Multi-turn Messages

- [ ] 我知道第二轮模型调用本身仍然是一个新的请求。
- [ ] 我能解释为什么“不带历史”时模型不知道第一轮信息。
- [ ] 我能解释为什么要把 `user1 + assistant1` 重新加入第二轮 messages。
- [ ] 我理解 `assistant` 是历史上下文的一部分。
- [ ] 我能解释“多轮对话”最基础的实现方式。

### 04 Streaming

- [ ] 我能解释 `stream:false` 和 `stream:true` 的区别。
- [ ] 我知道非流式读取的是 `message.content`。
- [ ] 我知道流式过程中读取的是 `delta.content`。
- [ ] 我能解释为什么完整 Assistant 需要把多个 delta 拼起来。
- [ ] 我实际观察过终端里多个 delta 连续到达。

等 04 真正理解以后，再进入 **05 Token / Context Window**。
