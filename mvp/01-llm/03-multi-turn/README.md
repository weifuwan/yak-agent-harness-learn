# 03 · Multi-turn Messages

> 核心问题：**模型为什么看起来能记住上一轮？**

这一节只学习一个概念：

> **多轮对话最基础的实现，就是应用把之前的 `user / assistant` 消息重新放进下一次请求的 `messages`。**

暂时不学习 Session、数据库、缓存、Token 压缩、Compaction。

---

## 1. 它处在整个流程什么位置？

前两节都是单次调用：

```text
User
 ↓
Model
 ↓
Assistant
```

这一节开始连续对话：

```text
Round 1
User 1
 ↓
Model
 ↓
Assistant 1

Round 2
User 1
+
Assistant 1
+
User 2
 ↓
Model
 ↓
Assistant 2
```

关键不是“模型自己记住了”，而是应用把上一轮重新发送给模型。

---

## 2. 如果不发送历史，会发生什么？

第一轮：

```text
user:
请记住：我叫魏福万。

assistant:
好的，我记住了。
```

第二轮如果只发送：

```json
[
  {
    "role": "user",
    "content": "我叫什么？"
  }
]
```

对于模型来说，这就是一次全新的请求。

它没有看到第一轮，自然不知道你之前说过什么。

---

## 3. 带上历史以后呢？

第二轮改成：

```json
[
  {
    "role": "user",
    "content": "请记住：我叫魏福万。"
  },
  {
    "role": "assistant",
    "content": "好的，我记住了。"
  },
  {
    "role": "user",
    "content": "我叫什么？"
  }
]
```

模型这次能看到完整上下文，因此可以继续回答。

所以最基础的多轮对话可以理解成：

```text
历史消息
+
当前消息
↓
一起重新发送给模型
```

---

## 4. 为什么 `assistant` 也必须保存？

对话历史不只是用户说过什么，还包括模型之前回答过什么。

例如：

```text
user:
HashMap 是什么？

assistant:
HashMap 是一种基于哈希表实现的 Map。

user:
那它和 Hashtable 有什么区别？
```

最后一句里的“它”，依赖前面的 `assistant` 内容才能形成完整上下文。

所以最基础的对话历史是：

```text
user
assistant
user
assistant
user
assistant
...
```

---

## 5. 运行实验

运行：

```bash
npm run llm:03 -- "我叫什么？"
```

程序会自动做一个对照实验。

### Round 1

```text
user:
请记住：我叫魏福万。

assistant:
模型确认
```

### Round 2A · 不带历史

发送给模型：

```text
system
user: 我叫什么？
```

### Round 2B · 带历史

发送给模型：

```text
system
user: 请记住：我叫魏福万
assistant: 第一轮模型回答
user: 我叫什么？
```

重点比较 2A 和 2B。

两次请求唯一关键差异就是：

> **有没有把上一轮 `user + assistant` 重新放进 `messages`。**

代码：[`index.ts`](./index.ts)

---

## 6. 当前代码只打印关键信息

01 / 02 已经观察过完整 HTTP Request / Response，所以这一节不再打印所有细节。

只观察：

```text
Round 1
├── user
└── assistant

Round 2A
├── 实际发送的 messages
└── assistant

Round 2B
├── 实际发送的 messages
└── assistant
```

当前真正重要的是 `messages` 如何变化。

---

## 7. 当前不要解决的问题

学完这一节，很自然会出现下一个问题：

```text
每聊一轮
↓
messages 增加
↓
历史越来越长
```

但现在先不要解决。

下面这些都留到后面：

```text
Streaming         ❌
Token / Context   ❌
Session           ❌
数据库持久化      ❌
Compaction        ❌
Memory            ❌
Tool              ❌
Agent Loop        ❌
```

现在只确认：**多轮对话为什么能成立。**

---

## Done

- [ ] 我知道第二轮调用本身仍然是一次新的模型请求。
- [ ] 我能解释为什么不带历史时，模型不知道第一轮发生过什么。
- [ ] 我能解释为什么要把 `user1 + assistant1` 重新加入第二轮 `messages`。
- [ ] 我理解 `assistant` 是历史上下文的一部分。
- [ ] 我能解释最基础的 Multi-turn Conversation 是怎么工作的。

如果这些能不用看代码解释清楚，这一节就完成了。