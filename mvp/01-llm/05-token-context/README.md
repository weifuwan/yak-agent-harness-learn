# 05 · Token / Context Window

核心问题：**多轮对话的 messages 可以一直无限增长吗？**

答案：不能。

在 `03 Multi-turn Messages` 里已经知道：下一轮请求会把前面的 `user / assistant` 历史重新发送给模型。

```text
Round 1
system + user1

Round 2
system + user1 + assistant1 + user2

Round 3
system + user1 + assistant1 + user2 + assistant2 + user3
```

历史越来越长以后，就会遇到这一阶段的两个新词：

```text
Token
Context Window
```

---

## 新词 1：Token

### Token 是什么？

可以先把 Token 理解成：

> **模型真正用来读取和生成文本的基本单位。**

模型并不是简单按照“字数”或“单词数”计算输入。

一段文本会先经过 tokenizer，被拆成若干 token。

所以先记住：

```text
字符数 ≠ Token 数
单词数 ≠ Token 数
```

不同模型的 tokenizer 可能不同，所以现在不要尝试用“几个汉字 = 一个 token”这种规则硬算。

这一阶段直接观察 Provider 返回的真实 `usage`。

通常会看到：

```json
{
  "usage": {
    "prompt_tokens": 120,
    "completion_tokens": 40,
    "total_tokens": 160
  }
}
```

先这样理解：

```text
prompt_tokens
= 这一次发送给模型的输入消耗

completion_tokens
= 模型这一次生成回答的消耗

total_tokens
= 本次请求统计的总 token
```

---

## 新词 2：Context Window

### Context Window 是什么？

可以先理解成：

> **模型一次请求能够处理的上下文容量是有限的。**

这个“上下文”里会包含很多东西：

```text
System Prompt
+
历史 User Messages
+
历史 Assistant Messages
+
当前 User Message
+
模型生成回答所需要的空间
```

可以想象成一个容量有限的盒子：

```text
┌─────────────────────────────────┐
│         Context Window          │
│                                 │
│ System                          │
│ User 1                          │
│ Assistant 1                     │
│ User 2                          │
│ Assistant 2                     │
│ User 3                          │
│ ...                             │
│                                 │
│ 还需要给新的 Assistant 留空间   │
└─────────────────────────────────┘
```

具体 Context Window 大小由模型决定，不同模型可能不同。

这一阶段**不需要记任何具体数字**。

只需要理解：

> **它有上限。**

---

## 为什么 Multi-turn 会碰到 Context Window？

因为我们现在的多轮实现非常直接：

```text
每聊一轮
↓
把新的 user / assistant 加进 history
↓
下一轮重新发送全部 history
↓
prompt_tokens 通常继续增加
```

于是：

```text
Multi-turn
↓
History 变长
↓
Token 增加
↓
逐渐逼近 Context Window
```

这就是后面为什么会出现 Context 管理、截断、Summary、Compaction 等问题。

但现在先不要解决。

---

## 运行

第一次运行仍然先准备：

```bash
npm install
cp .env.example .env
```

在 `.env` 中填写 `MODEL_API_KEY`。

直接运行：

```bash
npm run llm:05 -- "Java HashMap"
```

也可以换一个主题：

```bash
npm run llm:05 -- "Java ThreadLocal"
```

命令行参数只是本次三轮对话讨论的主题。

---

## 这个实验会做什么？

会连续调用模型 3 次。

### Round 1

```text
system
user1
```

问题类似：

```text
请用两句话解释 Java HashMap 是什么。
```

模型回答后，把：

```text
user1
assistant1
```

保存到当前程序内存里的 `history`。

---

### Round 2

发送：

```text
system
user1
assistant1
user2
```

也就是说，上一轮的历史被重新发送了一遍。

---

### Round 3

发送：

```text
system
user1
assistant1
user2
assistant2
user3
```

History 又变长了。

---

## 每轮重点看什么？

每一轮都会打印：

```text
messages
roles
user
assistant
prompt_tokens
completion_tokens
total_tokens
```

最后还会输出一个 Summary 表格，例如：

```text
┌─────────┬───────┬──────────┬───────────────┬───────────────────┬──────────────┐
│ round   │ messages │ prompt_tokens │ completion_tokens │ total_tokens │
├─────────┼──────────┼───────────────┼───────────────────┼──────────────┤
│ 1       │ 2        │ 50            │ 30                │ 80           │
│ 2       │ 4        │ 110           │ 40                │ 150          │
│ 3       │ 6        │ 190           │ 45                │ 235          │
└─────────┴──────────┴───────────────┴───────────────────┴──────────────┘
```

上面的数字只是示意，实际值以你运行时 Provider 返回的 `usage` 为准。

真正要观察的是趋势：

```text
messages 增加
↓
history 增加
↓
prompt_tokens 通常增加
```

---

## 一个容易混淆的地方

`prompt_tokens` 是**当前这一轮请求**的输入 token。

不是：

```text
“模型永久记住了多少 token”
```

例如 Round 3：

```text
system
+
user1
+
assistant1
+
user2
+
assistant2
+
user3
```

这些内容被重新发送，所以它们又会进入这一轮的 `prompt_tokens`。

这和 `03 Multi-turn` 是完全同一件事，只是现在开始用 Token 来观察成本和容量。

---

## 现在不要做什么？

即使你已经看到 `prompt_tokens` 越来越多，现在也先不要马上写解决方案：

```text
自动截断 History       ❌
只保留最近 N 轮        ❌
Summary               ❌
Compaction            ❌
Token Budget Manager  ❌
Context Manager       ❌
```

这一节的目标只是：

> **把问题真正看见。**

后面再研究成熟 Agent 为什么需要 Context 管理。

---

## 当前只需要理解 4 件事

```text
1. Token
   → 模型处理文本时使用的基本单位

2. prompt_tokens
   → 当前请求输入给模型的 token 使用量

3. Multi-turn 会不断增加历史 messages
   → 历史重新发送后，prompt_tokens 通常越来越多

4. Context Window 有上限
   → History 不可能无限增长
```

---

## Done 标准

- [ ] 我能用自己的话解释什么是 Token。
- [ ] 我知道字符数、单词数和 Token 数不是一回事。
- [ ] 我能解释 `prompt_tokens / completion_tokens / total_tokens`。
- [ ] 我能用自己的话解释什么是 Context Window。
- [ ] 我知道 Context Window 有上限，而且具体大小取决于模型。
- [ ] 我实际观察过 3 轮对话中 `messages` 和 `prompt_tokens` 的变化。
- [ ] 我能解释为什么 Multi-turn 最终一定会遇到上下文容量问题。

做到这些，`llm:05` 就够了。

下一步才进入 **06 · Provider Differences**。
