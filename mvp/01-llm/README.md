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

也可以换一个问题：

```bash
npm run llm:01 -- "Java 中 ArrayList 和 LinkedList 有什么区别？"
```

### 02 Message Roles / Persona Comparison

```bash
npm run llm:02 -- "解释一下 HashMap"
```

这条命令会保持 **User Prompt 完全相同**，连续用 3 个不同的 System Prompt 调用模型：

```text
资深 Java 工程师
初学者老师
Java 面试官
```

因此一次运行会发出 3 次模型请求。重点不是比较“谁回答得更好”，而是观察：**System Prompt 中定义的 persona 不同，模型输出的术语深度、表达方式、关注重点会发生什么变化。**

---

## 运行后重点观察什么

01 和 02 都会把一次调用的完整过程打印出来。

```text
Request URL
↓
Request Headers
↓
Request Body
↓
HTTP Status
↓
Response Headers
↓
Raw Response Body
↓
Parsed Payload
↓
Assistant Message
↓
Final Assistant Text
```

`Authorization` 会显示成 `Bearer <redacted>`，不会把真实 API Key 打到终端。

### 先重点看 Request Body

01 中最核心的是：

```json
{
  "model": "...",
  "messages": [
    {
      "role": "user",
      "content": "用一句话解释 HashMap"
    }
  ],
  "stream": false
}
```

先观察三个东西：

```text
model     → 这一次调用哪个模型
messages  → 这一次给模型看的消息
stream    → 当前要求一次性返回，而不是流式返回
```

02 中 `messages` 会多一个 `system`：

```json
{
  "messages": [
    {
      "role": "system",
      "content": "你是一名资深 Java 工程师..."
    },
    {
      "role": "user",
      "content": "解释一下 HashMap"
    }
  ]
}
```

下一次请求里，`user` 完全不变，只替换 `system`：

```text
System A：资深 Java 工程师
System B：初学者老师
System C：Java 面试官
```

这里要特别区分两个概念：

```text
system / user / assistant
= 消息角色（message role）

Java 工程师 / 初学者老师 / 面试官
= System Prompt 定义的人设（persona）
```

### 再重点看完整 Payload

Provider 返回的不只是 Assistant 文本。通常还能看到类似：

```text
id
object
created
model
choices
usage
...
```

先不要急着记每一个字段。

当前只重点顺着这一条路径看：

```text
payload
  ↓
choices[0]
  ↓
message
  ↓
role = assistant
content = 模型回答
```

也就是代码最终取：

```text
payload.choices[0].message.content
```

同时可以顺便观察：

```text
finish_reason  → 为什么这次生成结束
usage          → 这次请求大概用了多少 token
model          → Provider 实际返回的模型信息
```

这些字段后面学 Token、Streaming、Provider Differences 时还会再次遇到。现在只需要知道：**最终 Assistant Text 只是完整 Provider Response 中的一小部分。**

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
- 看懂完整 Provider Response，而不是只看最终文本；
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

这一步专门做一个控制变量实验：

```text
User Prompt：解释一下 HashMap
```

保持不变，只替换 System Prompt：

```text
① 资深 Java 工程师
   → 更容易强调实现原理、专业术语、工程实践

② 初学者老师
   → 更容易使用简单语言、类比、循序渐进的解释

③ Java 面试官
   → 更容易突出高频面试点、关键区别、追问方向
```

注意：这不是说 System Prompt 能百分之百控制模型，而是在观察 **System Prompt 如何影响模型的生成倾向**。

学习目标：

- 理解 `system / user / assistant` 三种最基础消息角色；
- 理解 System Prompt 是行为约束，不是当前用户任务；
- 区分 message role 和 persona；
- 观察 System 和 User 最终如何一起进入 Request Body；
- 观察返回的 `assistant` role 在完整 payload 中的位置；
- 用同一个 User Prompt 对比不同 System Prompt 下的输出变化；
- 理解为什么角色信息和任务信息要分开。

代码：[`02-message-roles/index.ts`](./02-message-roles/index.ts)

运行：

```bash
npm run llm:02 -- "解释一下 HashMap"
```

也可以换一个更容易观察差异的问题：

```bash
npm run llm:02 -- "Java 中为什么重写 equals 时通常也要重写 hashCode？"
```

运行结束后，重点比较三个回答：

```text
术语深度有没有变化？
表达方式有没有变化？
是否出现类比？
是否出现面试追问点？
相同知识点被强调的部分是否不同？
```

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
- [ ] 我能看懂一次完整 Response Payload 的基本结构。
- [ ] 我能从 `payload → choices[0] → message → content` 找到最终回答。
- [ ] 我知道这还不是 Agent。

### 02 Message Roles

- [ ] 我能解释 System Prompt 和 User Prompt 的区别。
- [ ] 我能解释 `system / user / assistant` 三种消息角色。
- [ ] 我能区分 message role 和 persona。
- [ ] 我能在 Request Body 中找到 system / user。
- [ ] 我能在 Response Payload 中找到 assistant。
- [ ] 我实际对比过至少 3 个不同 System Prompt 的回答。
- [ ] 我能说出 System Prompt 主要改变了回答的哪些方面。
- [ ] 我理解为什么角色信息和任务信息要分开。

等这两个问题真正熟悉以后，再进入 **03 Multi-turn Messages**。
