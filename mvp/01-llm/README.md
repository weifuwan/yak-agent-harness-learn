# 01 · LLM 学习

> 按 LLM 应用能力的演进顺序学习：每次只增加一个问题和一个能力。

当前原则：**没有遇到问题之前，不提前引入答案。**

## 快速测试

第一次运行：

```bash
npm install
cp .env.example .env
```

在 `.env` 中填写 `MODEL_API_KEY` 后，直接运行对应阶段。

### 01 · Basic Call

```bash
npm run llm:01 -- "用一句话解释 HashMap"
```

### 02 · Message Roles

```bash
npm run llm:02 -- "解释一下 HashMap"
```

### 03 · Multi-turn Messages

```bash
npm run llm:03 -- "我叫什么？"
```

### 04 · Streaming

```bash
npm run llm:04 -- "请详细解释 Java HashMap 的工作原理"
```

### 05 · Token / Context Window

```bash
npm run llm:05 -- "Java HashMap"
```

也可以换一个主题：

```bash
npm run llm:05 -- "Java ThreadLocal"
```

这一步会连续做 3 轮对话，并打印：

```text
messages
prompt_tokens
completion_tokens
total_tokens
```

独立说明：[`05-token-context/README.md`](./05-token-context/README.md)

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

当前进度：

```text
01 Basic Call             ✅
02 Message Roles          ✅
03 Multi-turn Messages    ✅
04 Streaming              ✅
05 Token / Context Window ← 当前
06～08                    ← 暂时不展开
```

---

# 01 · Basic Call

核心问题：**一次最简单的大模型调用，到底发生了什么？**

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

这一阶段认识：

```text
model
messages
payload.choices[0].message.content
```

运行：

```bash
npm run llm:01 -- "用一句话解释 HashMap"
```

---

# 02 · Message Roles

核心问题：**为什么要把“你是谁”和“用户这次要什么”分开？**

```text
system    = 规则 / 身份
user      = 用户说的话
assistant = 模型说的话
```

同时区分：

```text
system / user / assistant
= message role

Java 工程师 / 初学者老师 / 面试官
= System Prompt 定义的 persona
```

运行：

```bash
npm run llm:02 -- "解释一下 HashMap"
```

---

# 03 · Multi-turn Messages

核心问题：**模型为什么看起来能记住上一轮？**

因为下一轮请求把历史重新发了一遍：

```text
第一轮
system + user1
↓
assistant1

第二轮
system + user1 + assistant1 + user2
↓
assistant2
```

所以：

> **Multi-turn 最基础的实现，就是应用保存 History，并在下一轮重新发送。**

运行：

```bash
npm run llm:03 -- "我叫什么？"
```

独立说明：[`03-multi-turn/README.md`](./03-multi-turn/README.md)

---

# 04 · Streaming

核心问题：**模型回答比较慢时，能不能生成一点，就先返回一点？**

```text
stream:false
→ 等完整回答
→ message.content

stream:true
→ delta 1
→ delta 2
→ delta 3
→ ...
→ 自己拼成完整 Assistant
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

独立说明：[`04-streaming/README.md`](./04-streaming/README.md)

---

# 05 · Token / Context Window

核心问题：**多轮对话的 History 可以一直无限增长吗？**

不能。

这一阶段认识两个新词。

## Token

先理解成：

> **模型真正用来读取和生成文本的基本单位。**

不要把 Token 简单等同于字符或单词：

```text
字符数 ≠ Token 数
单词数 ≠ Token 数
```

这一步直接观察 Provider 返回的 `usage`：

```text
prompt_tokens
completion_tokens
total_tokens
```

## Context Window

先理解成：

> **模型一次请求能够处理的上下文容量是有限的。**

上下文里会逐渐塞入：

```text
System Prompt
+
User 1
+
Assistant 1
+
User 2
+
Assistant 2
+
User 3
+
...
```

于是从 03 的 Multi-turn 会自然走到：

```text
History 变长
↓
输入 Token 增加
↓
逐渐逼近 Context Window
```

`llm:05` 会做 3 轮连续对话：

```text
Round 1
system + user1

Round 2
system + user1 + assistant1 + user2

Round 3
system + user1 + assistant1 + user2 + assistant2 + user3
```

每一轮都打印真实 `usage`，最后用表格对比。

运行：

```bash
npm run llm:05 -- "Java HashMap"
```

代码：[`05-token-context/index.ts`](./05-token-context/index.ts)

详细说明：[`05-token-context/README.md`](./05-token-context/README.md)

这一阶段只需要看见问题：

```text
Multi-turn
↓
History 越来越长
↓
prompt_tokens 通常越来越多
↓
Context Window 有上限
```

暂时不要解决：

```text
History 截断         ❌
Summary              ❌
Compaction           ❌
Token Budget Manager ❌
Context Manager      ❌
```

---

## 当前 Done 标准

### 01 Basic Call

- [ ] 我能解释一次请求发送了什么。
- [ ] 我知道 Assistant Text 从哪里取出来。
- [ ] 我知道这还不是 Agent。

### 02 Message Roles

- [ ] 我能解释 `system / user / assistant`。
- [ ] 我能区分 message role 和 persona。

### 03 Multi-turn Messages

- [ ] 我知道每一轮仍然是一次新的模型请求。
- [ ] 我能解释为什么要重新发送 `user + assistant` History。

### 04 Streaming

- [ ] 我能解释 `stream:false / stream:true`。
- [ ] 我知道 `message.content / delta.content` 的区别。
- [ ] 我知道完整 Assistant 是多个 delta 拼起来的。

### 05 Token / Context Window

- [ ] 我能用自己的话解释 Token。
- [ ] 我能解释 `prompt_tokens / completion_tokens / total_tokens`。
- [ ] 我能用自己的话解释 Context Window。
- [ ] 我实际观察过 History 增长后 `prompt_tokens` 的变化。
- [ ] 我知道 Context Window 有上限，History 不能无限增长。

等 05 真正理解以后，再进入 **06 · Provider Differences**。
