# 03 · Multi-turn Messages · Web Chat

这个页面只是为了更直观地观察多轮对话和 Markdown 输出。

它不是一个完整聊天产品，也不引入 Session、数据库或缓存。

## 启动

第一次运行：

```bash
npm install
cp .env.example .env
```

在 `.env` 中填写 `MODEL_API_KEY`。

启动 Web Chat：

```bash
npm run llm:03:web
```

浏览器打开：

```text
http://127.0.0.1:3030
```

CLI 对照实验仍然保留：

```bash
npm run llm:03 -- "我叫什么？"
```

## 页面里发生了什么？

浏览器里只有一个普通 JavaScript 数组：

```text
messages = []
```

第一次发送：

```text
messages
↓
[
  { role: "user", content: "我叫魏福万，请记住" }
]
↓
POST /api/chat
↓
模型回答
↓
浏览器追加 assistant
```

此时浏览器内存变成：

```text
[
  { role: "user", content: "我叫魏福万，请记住" },
  { role: "assistant", content: "好的，我记住了。" }
]
```

第二次发送“我叫什么？”时，浏览器不是只发送新问题，而是发送：

```text
[
  user1,
  assistant1,
  user2
]
```

后端再加上自己的 System Prompt：

```text
system
+
user1
+
assistant1
+
user2
↓
Model
```

这就是当前阶段最重要的知识点：

> **多轮对话最基础的实现，不是模型保存了上一轮，而是应用把历史 messages 重新发给模型。**

## 为什么刷新页面后会消失？

因为当前版本故意没有：

```text
数据库        ❌
localStorage  ❌
sessionStorage ❌
Redis         ❌
服务端 Session ❌
```

历史只存在浏览器当前页面的 `messages` 数组里。

所以：

```text
刷新页面
↓
JavaScript 重新加载
↓
messages = []
↓
对话消失
```

这正是当前想观察的效果。

## 前后端职责

```text
Browser
├── 展示 user / assistant
├── 保存当前页面内的 messages
├── 每轮把完整 messages 发给后端
└── 展示 Markdown

POST /api/chat
↓
Node Server
├── 校验 messages
├── 添加 System Prompt
├── 调用模型
├── 取出 assistant content
├── Markdown → HTML
└── 返回 assistant
```

后端本身不保存历史。

## Markdown

Assistant 原始返回仍然保存为 Markdown：

```json
{
  "role": "assistant",
  "content": "## 标题\n\n```java\n...\n```"
}
```

为了浏览器展示方便，后端同时使用 `markdown-it` 渲染 HTML。

`html: false`，所以模型返回的原始 HTML 不会直接作为可信 HTML 执行。

## Learning View

页面右侧会实时显示当前浏览器里的 `messages`。

例如：

```json
[
  {
    "role": "user",
    "content": "HashMap 是什么？"
  },
  {
    "role": "assistant",
    "content": "HashMap 是..."
  },
  {
    "role": "user",
    "content": "那它线程安全吗？"
  }
]
```

这个区域比聊天气泡更重要。

每发送一轮，都观察一次它是怎么增长的。

## 当前不要解决

```text
Streaming        ❌
持久化 Session   ❌
Token Budget     ❌
Compaction       ❌
Tool             ❌
Agent Loop       ❌
```

现在只理解：

```text
浏览器内存中的 History
+
当前 User Message
↓
每轮重新发送
↓
产生 Multi-turn Conversation
```
