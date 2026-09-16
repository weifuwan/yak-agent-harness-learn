# 04 · Streaming

核心问题：**模型回答比较慢时，能不能生成一点，就先返回一点？**

在 01～03 里，请求都是：

```json
{
  "stream": false
}
```

这意味着：

```text
模型开始生成
↓
继续生成
↓
继续生成
↓
完整答案生成结束
↓
一次性返回 assistant.content
```

如果回答比较长，用户就会一直等。

---

## 04 只增加一个变化

把：

```json
{
  "stream": false
}
```

改成：

```json
{
  "stream": true
}
```

响应方式就从“完整结果”变成“连续增量”。

```text
模型生成一点
↓
返回一个 delta
↓
再生成一点
↓
再返回一个 delta
↓
...
↓
结束
```

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
npm run llm:04 -- "请详细解释 Java HashMap 的工作原理"
```

也可以换一个更长的问题：

```bash
npm run llm:04 -- "请详细解释 Java 中 HashMap 扩容、哈希冲突和红黑树转换的过程"
```

---

## 这个实验会做两次请求

User Prompt 完全相同。

### A · stream: false

```text
User Prompt
↓
Model
↓
等待完整生成
↓
message.content
```

终端会类似：

```text
等待完整回答...

[3200 ms 后一次性拿到完整回答]
HashMap 是 Java 中...
```

这里重点观察：

> **在完整 Response 返回以前，应用拿不到 Assistant 正文。**

---

### B · stream: true

同一个 Prompt，再请求一次：

```text
User Prompt
↓
Model
↓
delta 1
↓
delta 2
↓
delta 3
↓
...
```

终端会类似：

```text
[delta 1] "Hash"
[delta 2] "Map"
[delta 3] " 是"
[delta 4] " Java"
...
```

程序同时不断做：

```text
finalText += delta
```

所以：

```text
Hash
+
Map
+
 是
+
 Java
+
...
↓
最终完整 Assistant
```

---

## `message.content` 和 `delta.content` 的区别

### 非流式

最终 Response 大致是：

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "HashMap 是 Java 中..."
      }
    }
  ]
}
```

我们取：

```text
choices[0].message.content
```

它已经是一整段完整回答。

### 流式

响应不是一个完整 JSON。

会不断出现类似：

```text
data: {"choices":[{"delta":{"content":"Hash"}}]}

data: {"choices":[{"delta":{"content":"Map"}}]}

data: {"choices":[{"delta":{"content":" 是"}}]}

data: [DONE]
```

我们每次取：

```text
choices[0].delta.content
```

这里的 `delta` 可以先理解成：

> **这一小次新增了什么。**

---

## 代码里发生了什么？

当前实现刻意不用 AI SDK / OpenAI SDK。

直接看最底层过程：

```text
fetch(stream: true)
↓
response.body
↓
getReader()
↓
一批字节
↓
TextDecoder
↓
SSE 文本
↓
data: {...}
↓
JSON.parse
↓
delta.content
↓
finalText += delta
```

核心代码路径：

```text
response.body.getReader()
↓
reader.read()
↓
TextDecoder.decode()
↓
choices[0].delta.content
```

现在不用记 SSE 的所有协议细节，只需要看懂数据是怎么一点一点到达应用的。

---

## 为什么要打印每一个 delta？

真实产品通常不会打印：

```text
[delta 1]
[delta 2]
[delta 3]
```

而是收到一个 delta，就立刻更新 UI。

这里故意逐块打印，是为了让 Streaming 变得可见。

你真正要观察的是：

```text
Provider 没有一次给完整 Assistant
而是连续给很多小 delta
```

---

## Timing 也可以顺便看

脚本最后会打印：

```text
首个 delta: xxx ms
流结束: xxxx ms
delta 数量: xx
```

这里先不要做性能分析。

只体会一个区别：

```text
stream:false
用户要等到“完整答案生成完”才看到正文

stream:true
首个 delta 到达后，就已经可以开始展示正文
```

Streaming 主要改善的是**感知等待时间和交互体验**，不代表模型一定更快完成整段生成。

---

## 当前只需要理解 4 件事

```text
1. stream:false
   → 完整回答一次性返回

2. stream:true
   → 回答被拆成连续的小块

3. delta.content
   → 这一块新增的文本

4. 完整 Assistant
   → 所有 delta.content 按顺序拼起来
```

---

## 当前不要解决

```text
Provider 抽象        ❌
统一 Stream Event    ❌
LLMEvent             ❌
Adapter              ❌
Abort                ❌
Retry                ❌
Tool Streaming       ❌
Agent Loop           ❌
```

虽然你会发现不同 Provider 的流式格式可能不同，但这是后面的 **Provider Differences** 才处理的问题。

现在不要提前抽象。

---

## Done 标准

- [ ] 我能解释 `stream:false` 和 `stream:true` 的区别。
- [ ] 我知道非流式最终读取的是 `message.content`。
- [ ] 我知道流式过程中读取的是 `delta.content`。
- [ ] 我能解释为什么完整 Assistant 需要把多个 delta 拼起来。
- [ ] 我实际观察过多个 `delta` 到达终端。
- [ ] 我理解 Streaming 主要解决“等待完整回答期间没有反馈”的体验问题。

做到这些，`llm:04` 就够了。

下一步才进入 **05 · Token / Context Window**。
