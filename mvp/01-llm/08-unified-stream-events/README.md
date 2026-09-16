# 08 · Unified Stream Events

核心问题：**07 已经统一了完整请求 / 完整响应，Streaming 过程还需要统一吗？**

需要。

07 的核心是：

```text
Provider.chat(request)
↓
LLMResponse
```

08 关注的是一个持续过程：

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

所以这一节第一次定义我们自己的：

```text
LLMEvent
```

---

## 这次使用的两个 Provider

```text
DeepSeek
Kimi / Moonshot
```

和之前 Anthropic 对比不同，这两个 Provider 当前都提供 OpenAI-compatible Chat Completions Streaming。

所以它们的文字流式结构非常接近：

```text
data: { ... choices[0].delta.content ... }

data: { ... choices[0].delta.content ... }

data: [DONE]
```

这会得到一个很重要的新认识：

> **统一内部事件，不一定要求外部协议已经完全不同。它也可以用来固定 consumer 与 Provider 之间的边界。**

---

## LLMEvent

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
reasoning   ❌
tool-call   ❌
usage event ❌
error event ❌
retry       ❌
```

这一节只解决：

> **统一文字 Streaming。**

---

## Provider 接口

```ts
interface Provider {
  readonly name: string
  readonly model: string

  stream(request: LLMRequest): AsyncIterable<LLMEvent>
}
```

这里的：

```text
AsyncIterable<LLMEvent>
```

可以先理解成：

> **一个会异步不断产生 LLMEvent 的数据流。**

consumer 使用：

```ts
for await (const event of provider.stream(request)) {
  // 一条一条处理
}
```

---

## DeepSeekProvider

内部知道：

```text
POST /chat/completions
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

---

## KimiProvider

Kimi / Moonshot Open Platform 也使用 OpenAI-compatible Chat Completions：

```text
POST /v1/chat/completions
stream: true
SSE
choices[0].delta.content
[DONE]
```

对外同样只 yield：

```text
start
text-delta
finish
```

所以当前两个 Provider 的内部代码会比较像。

这不是问题，反而说明：

```text
Provider 不同
Protocol 可以相同
内部事件契约仍然可以稳定
```

---

## Consumer

核心代码：

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

它不认识：

```text
api.deepseek.com
api.moonshot.cn
Bearer API Key
choices[0].delta.content
SSE buffer
TextDecoder
[DONE]
```

这些全部属于 Provider 实现内部。

---

## 配置

DeepSeek：

```env
MODEL_API_KEY=
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
```

Kimi 中国区 Open Platform：

```env
KIMI_API_KEY=
KIMI_BASE_URL=https://api.moonshot.cn/v1
KIMI_MODEL=kimi-k3
```

国际版 Open Platform：

```env
KIMI_BASE_URL=https://api.moonshot.ai/v1
```

---

## 运行

```bash
npm run llm:08 -- "请用一小段话解释 Java HashMap，控制在 120 字以内"
```

只配置 Kimi 也能测试：

```text
KIMI_API_KEY=...
```

没有 DeepSeek Key 时，DeepSeek 会自动跳过。

---

## 输出大概长这样

```text
========== Kimi ==========
[start] provider=Kimi, model=kimi-k3
[assistant]
HashMap 是 Java 中...
[finish]

[summary] delta count: 18
```

DeepSeek 也使用相同的 consumer 输出格式。

---

## 07 和 08 的区别

### 07

统一最终结果：

```text
Request
↓
完整 Response
```

```ts
await provider.chat(request)
```

### 08

统一生成过程：

```text
start
↓
text-delta
↓
text-delta
↓
finish
```

```ts
for await (const event of provider.stream(request)) {
  // handle event
}
```

可以记成：

> **07 固定“调用完成后拿到什么”，08 固定“生成过程中看到什么”。**

---

## 为什么这层仍然有意义？

你可能会发现：

```text
DeepSeek Stream
Kimi Stream
```

现在非常像。

那为什么还需要 `LLMEvent`？

因为 consumer 应该依赖：

```text
我们的内部语义
```

而不是：

```text
某个外部 API 的 JSON 字段
```

今天两边都兼容 OpenAI；以后如果加入非 OpenAI-compatible Provider，变化只发生在 Provider 内部。

consumer 仍然处理：

```text
start
text-delta
finish
```

---

## 当前不要继续加

```text
Reasoning Event ❌
Tool Call Event ❌
Usage Event     ❌
Abort           ❌
Retry           ❌
Provider Registry ❌
```

先把最小 Stream Contract 理解清楚。

---

## Done 标准

- [ ] 我能解释为什么 07 和 08 是两种不同的统一。
- [ ] 我能解释 `start / text-delta / finish`。
- [ ] 我能解释 `AsyncIterable<LLMEvent>`。
- [ ] 我能看懂 `for await...of` 如何持续消费事件。
- [ ] 我知道 DeepSeek 和 Kimi 当前的流式协议都兼容 OpenAI Chat Completions。
- [ ] 我知道 Provider 内部负责把原始流转换成统一 LLMEvent。
- [ ] 我能解释为什么换 Provider 后 consumer 不需要修改。

做到这些，`llm:08` 就够了。
