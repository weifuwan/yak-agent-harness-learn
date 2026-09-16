# 08 · Unified Stream Events

核心问题：**07 已经统一了完整请求 / 完整响应，但不同 Provider 的 Streaming 事件还能继续污染 consumer 吗？**

答案：如果不再统一一层，会。

在 `04 Streaming` 里已经知道：

```text
stream:true
↓
Provider 不断返回增量
↓
应用持续消费
```

在 `06 Provider Differences` 又看到：不同 Provider 的协议并不一样。

所以到了 08，真正的问题变成：

> **能不能让 consumer 不再认识 DeepSeek / Anthropic 的原始流式事件？**

---

## 先看原始差异

### DeepSeek

DeepSeek 的 Chat Completions 流式响应是 SSE。

文字增量主要来自：

```text
choices[0].delta.content
```

流结束时会看到：

```text
data: [DONE]
```

可以先粗略理解成：

```text
HTTP stream ready
↓
delta.content
↓
delta.content
↓
delta.content
↓
[DONE]
```

### Anthropic

Anthropic Messages API 也是流式事件，但事件语义不同。

当前只关注文字相关的三个阶段：

```text
message_start
↓
content_block_delta
  └── delta.type = text_delta
      └── delta.text
↓
message_stop
```

所以同样一个“模型开始说话 → 不断吐文本 → 结束”的过程，Provider 原始数据并不一样。

---

## 08 第一次定义 LLMEvent

代码：[`types.ts`](./types.ts)

当前只定义最小的 3 种事件：

```ts
type LLMEvent =
  | {
      type: "start"
      provider: string
      model: string
    }
  | {
      type: "text-delta"
      text: string
    }
  | {
      type: "finish"
    }
```

暂时没有：

```text
reasoning        ❌
tool-call        ❌
usage            ❌
error event      ❌
step event       ❌
retry event      ❌
```

因为这一节只解决一件事：**统一文字 Streaming。**

---

## Provider 接口发生了什么变化？

07 里学的是完整结果：

```ts
provider.chat(request)
```

08 关注持续过程：

```ts
provider.stream(request)
```

接口：

```ts
interface Provider {
  readonly name: string
  readonly model: string

  stream(request: LLMRequest): AsyncIterable<LLMEvent>
}
```

这里第一次出现：

```text
AsyncIterable<LLMEvent>
```

可以先理解成：

> **一个可以异步不断产生 LLMEvent 的数据流。**

consumer 用：

```ts
for await (const event of provider.stream(request)) {
  // 一条一条处理事件
}
```

---

## DeepSeekProvider 做什么？

代码：[`deepseek-provider.ts`](./deepseek-provider.ts)

Provider 内部仍然知道 DeepSeek 的真实协议：

```text
/chat/completions
stream: true
SSE
data: {...}
choices[0].delta.content
data: [DONE]
```

但对外只 yield：

```text
start
text-delta
finish
```

转换关系：

```text
HTTP stream ready
→ start

choices[0].delta.content = "Hash"
→ { type: "text-delta", text: "Hash" }

data: [DONE]
→ finish
```

---

## AnthropicProvider 做什么？

代码：[`anthropic-provider.ts`](./anthropic-provider.ts)

内部认识 Anthropic：

```text
/v1/messages
stream: true
message_start
content_block_delta
text_delta
message_stop
```

但对外还是同样的：

```text
message_start
→ start

content_block_delta + text_delta
→ text-delta

message_stop
→ finish
```

所以 Provider-specific 协议被关在 Provider 实现内部。

---

## Consumer 终于完全不认识 Provider 流协议

代码：[`index.ts`](./index.ts)

核心 consumer：

```ts
for await (const event of provider.stream(input)) {
  handleEvent(event)
}
```

`handleEvent()` 只认识：

```text
start
text-delta
finish
```

它不知道：

```text
choices[0].delta.content
[DONE]
message_start
content_block_delta
text_delta
message_stop
```

这些都属于 Provider 内部。

---

## 运行

DeepSeek 沿用之前配置：

```env
MODEL_API_KEY=
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
```

Anthropic 可选：

```env
ANTHROPIC_API_KEY=
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=claude-sonnet-5
```

运行：

```bash
npm run llm:08 -- "请用一小段话解释 Java HashMap，控制在 120 字以内"
```

没有 `ANTHROPIC_API_KEY` 时，只运行 DeepSeek。

---

## 运行时重点看什么？

输出大概会是：

```text
========== DeepSeek ==========
[start] provider=DeepSeek, model=...
[assistant]
HashMap 是 Java 中...
[finish]

[summary] delta count: 18
```

如果同时配置 Anthropic：

```text
========== Anthropic ==========
[start] provider=Anthropic, model=...
[assistant]
HashMap 是 Java 中...
[finish]
```

注意：

> **终端看不到 Provider 原始事件差异了。**

因为这些差异已经在 Provider 内部被翻译成 `LLMEvent`。

---

## 07 和 08 到底有什么区别？

### 07 · Unified LLM Interface

统一的是：

```text
完整 Request
↓
完整 Response
```

核心形态：

```ts
const result = await provider.chat(request)
```

### 08 · Unified Stream Events

统一的是：

```text
开始
↓
文本增量
↓
文本增量
↓
...
↓
结束
```

核心形态：

```ts
for await (const event of provider.stream(request)) {
  // handle event
}
```

所以可以记成：

> **07 隐藏最终结果的 Provider 差异；08 隐藏生成过程中的 Provider 差异。**

---

## 为什么这时候 LLMEvent 才合理？

如果一开始只有 DeepSeek：

```text
choices[0].delta.content
```

直接处理就够了。

当第二个 Provider 出现以后：

```text
DeepSeek delta
Anthropic content_block_delta
```

consumer 开始被 Provider 协议污染。

这时候统一事件才有真实价值：

```text
DeepSeek raw stream
        ↓
DeepSeekProvider
        ↓
      LLMEvent
        ↑
AnthropicProvider
        ↑
Anthropic raw stream
```

所以还是同一个原则：

> **先出现真实差异，再抽象。**

---

## 当前不要继续加

```text
Reasoning Event      ❌
Tool Call Event      ❌
Usage Event          ❌
Error Event          ❌
Abort                ❌
Retry                ❌
AI SDK Adapter       ❌
Native Runtime       ❌
```

这些以后真正遇到问题时再增加。

---

## Done 标准

- [ ] 我能解释为什么 07 还没有解决 Streaming 差异。
- [ ] 我知道 DeepSeek 和 Anthropic 的原始 Streaming 事件不同。
- [ ] 我能解释 `start / text-delta / finish`。
- [ ] 我能解释 `AsyncIterable<LLMEvent>` 大概是什么意思。
- [ ] 我能看懂 `for await...of` 是怎么持续消费事件的。
- [ ] 我知道 Provider 负责把自己的原始协议翻译成统一 LLMEvent。
- [ ] 我能解释为什么换 Provider 后 consumer 不需要修改。

做到这些，`llm:08` 就够了。
