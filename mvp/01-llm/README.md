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

这一条会自动做一个对照实验：

```text
第一轮：
user      → 请记住：我叫魏福万
assistant → 模型确认

第二轮 A：不带历史
user      → 我叫什么？

第二轮 B：带历史
user      → 请记住：我叫魏福万
assistant → 第一轮模型回答
user      → 我叫什么？
```

重点观察第二轮 A 和第二轮 B 的区别。

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
03 Multi-turn Messages ← 当前
04～08                 ← 暂时不展开
```

---

# 01 · Basic Call

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

在 01 的基础上只增加消息角色：

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

需要区分两个概念：

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

也可以用更容易看出 persona 差异的问题：

```bash
npm run llm:02 -- "Java 中为什么重写 equals 时通常也要重写 hashCode？"
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

## 先看第一轮

```text
System
+
User 1：请记住，我叫魏福万
        ↓
      Model
        ↓
Assistant 1：知道了
```

第一轮请求结束后，模型调用本身就结束了。

## 第二轮如果不带历史

```text
System
+
User 2：我叫什么？
        ↓
      Model
```

此时这实际上是一次新的请求。

模型没有看到：

```text
User 1
Assistant 1
```

所以它不知道第一轮发生过什么。

## 第二轮如果带历史

应用重新发送：

```text
System
+
User 1
+
Assistant 1
+
User 2
        ↓
      Model
```

对应的 `messages` 大致是：

```json
[
  {
    "role": "system",
    "content": "你是一个简洁的对话助手..."
  },
  {
    "role": "user",
    "content": "请记住：我叫魏福万。"
  },
  {
    "role": "assistant",
    "content": "知道了。"
  },
  {
    "role": "user",
    "content": "我叫什么？"
  }
]
```

模型现在能回答名字，不是因为 API 自动保存了第一轮，而是因为：

```text
历史消息
+
当前消息
↓
一起重新发送给模型
```

## 为什么 Assistant 也要放进去？

因为对话历史不只有用户说过什么，还包括模型自己之前回答过什么。

例如：

```text
user:
HashMap 是什么？

assistant:
HashMap 是一种基于哈希表实现的 Map。

user:
那它和 Hashtable 有什么区别？
```

如果没有上一轮的 `assistant`，第二个 User Message 里的“它”就缺少重要上下文。

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

## 代码

[`03-multi-turn/index.ts`](./03-multi-turn/index.ts)

运行：

```bash
npm run llm:03 -- "我叫什么？"
```

这一次不再打印完整 HTTP / Payload，只打印当前最需要观察的内容：

```text
Round 1
├── user
└── assistant

Round 2A · 不带历史
├── 发送给模型的 messages
└── assistant

Round 2B · 带历史
├── 发送给模型的 messages
└── assistant
```

重点比较：

```text
2A messages:
system
user2

2B messages:
system
user1
assistant1
user2
```

**这就是 llm:03 最重要的知识点。**

---

## 当前不要继续解决的问题

学完 03 后，你很快会发现一个新问题：

```text
每聊一轮
↓
messages 增加
↓
历史越来越长
```

但现在先不要解决它。

后面会分别学习：

```text
Streaming             ❌
Token / Context Window ❌
Provider 抽象          ❌
LLM class              ❌
LLMEvent               ❌
Tool                   ❌
Agent Loop             ❌
Session                ❌
Compaction             ❌
```

先只确认：**你真的理解多轮对话为什么能成立。**

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

等 03 真正理解以后，再进入 **04 Streaming**。
