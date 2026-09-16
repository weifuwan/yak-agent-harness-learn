# 07 · Unified LLM Interface

核心问题：**既然不同 Provider 的协议不一样，上层业务代码能不能不要知道这些差异？**

在 `06 Provider Differences` 里已经看到：

```text
DeepSeek
├── /chat/completions
├── system 放在 messages
├── choices[0].message.content
└── prompt_tokens / completion_tokens

Anthropic
├── /v1/messages
├── system 是顶层字段
├── content[].text
└── input_tokens / output_tokens
```

业务目的却完全一样：

```text
输入 Prompt / Messages
↓
调用模型
↓
得到 Assistant
```

所以这一节第一次引入一个合理的抽象：**统一 LLM 接口。**

---

## 为什么现在才抽象？

01～05 只有一个 Provider 时：

```text
App
↓
DeepSeek
```

直接调用最简单。

到了 06，第二个 Provider 出现以后，真实问题才出现：

```text
两套 URL
两套 Headers
两套 Request Body
两套 Response 解析
两套 Usage 字段
```

所以顺序是：

```text
06 Provider Differences
先看到重复和差异
↓
07 Unified LLM Interface
再提取共同边界
```

> **抽象不是为了“架构好看”，而是因为变化点已经真实存在。**

---

## 新的统一契约

代码：[`types.ts`](./types.ts)

### LLMRequest

```ts
type LLMRequest = {
  system?: string
  messages: ChatMessage[]
}
```

上层只表达：

```text
System Prompt
+
Conversation Messages
```

不表达：

```text
DeepSeek 的 JSON 怎么写
Anthropic 的 JSON 怎么写
```

### LLMResponse

```ts
type LLMResponse = {
  content: string
  usage: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
}
```

上层只接收统一字段：

```text
content
inputTokens
outputTokens
totalTokens
```

不用再记：

```text
prompt_tokens
completion_tokens
input_tokens
output_tokens
```

---

## Provider 接口

```ts
interface Provider {
  readonly name: string
  readonly model: string

  chat(request: LLMRequest): Promise<LLMResponse>
}
```

现在 consumer 只需要：

```ts
const response = await provider.chat(request)
```

它不需要知道 `provider` 到底是：

```text
DeepSeekProvider
AnthropicProvider
```

---

## DeepSeekProvider 做什么？

代码：[`deepseek-provider.ts`](./deepseek-provider.ts)

它接收统一的：

```text
LLMRequest
```

内部转换成 DeepSeek 能理解的格式：

```text
system
↓
messages 中 role=system

messages
↓
/chat/completions
```

然后把 DeepSeek Response：

```text
choices[0].message.content
prompt_tokens
completion_tokens
total_tokens
```

转换成统一的：

```text
LLMResponse.content
LLMResponse.usage.inputTokens
LLMResponse.usage.outputTokens
LLMResponse.usage.totalTokens
```

---

## AnthropicProvider 做什么？

代码：[`anthropic-provider.ts`](./anthropic-provider.ts)

它接收的仍然是完全相同的：

```text
LLMRequest
```

但内部转换成 Anthropic 的格式：

```text
system
↓
body.system

messages
↓
/v1/messages
```

然后把：

```text
content[].text
input_tokens
output_tokens
```

转换成同一个：

```text
LLMResponse
```

---

## 最重要的变化

### 06 的世界

```text
Consumer
├── 知道 DeepSeek 怎么调
└── 知道 Anthropic 怎么调
```

### 07 的世界

```text
Consumer
        ↓
Provider.chat(request)
        ↓
   ┌────┴────┐
   ↓         ↓
DeepSeek   Anthropic
Provider   Provider
```

Provider-specific 的细节被关在各自实现内部。

---

## 同一个 Consumer

[`index.ts`](./index.ts) 里只有一个 consumer：

```ts
async function runProvider(provider: Provider, input: LLMRequest) {
  const response = await provider.chat(input)

  console.log(response.content)
  console.log(response.usage)
}
```

然后只是替换实现：

```ts
await runProvider(deepSeek, request)
await runProvider(anthropic, request)
```

注意：

> **换 Provider 时，`runProvider()` 本身完全不用修改。**

这就是本节最重要的实验。

---

## 运行

DeepSeek 仍然使用：

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
npm run llm:07 -- "请用三句话解释 Java HashMap"
```

只配置 DeepSeek 也能运行；Anthropic 会自动跳过。

---

## 这里第一次真正理解：LLM ≠ Provider

可以先这样理解：

```text
上层想要的是：
“调用 LLM，得到回答”

底层实现可能是：
DeepSeekProvider
AnthropicProvider
OpenAIProvider
...
```

所以：

```text
LLM 能力
= 稳定需求

Provider 协议
= 可替换实现
```

当前 `Provider` 接口就是两者之间最小的边界。

---

## 为什么 `system` 单独放在 LLMRequest？

这是一个刻意的设计。

因为 06 已经看到：

```text
DeepSeek → system 是 message
Anthropic → system 是顶层字段
```

如果上层直接写 Provider-specific 的 messages，差异又泄漏上来了。

所以统一请求表达的是业务含义：

```text
system
messages
```

具体怎么翻译，由 Provider 实现负责。

---

## 当前不要继续抽象

现在不要增加：

```text
Provider Factory       ❌
Provider Registry      ❌
Dependency Injection   ❌
Plugin System          ❌
统一 Streaming Event   ❌
Retry                   ❌
Fallback                ❌
```

因为当前只有两个 Provider，最小接口已经足够说明问题。

---

## 07 还没有解决 Streaming

当前接口是：

```ts
chat(request): Promise<LLMResponse>
```

也就是说：

```text
完整 Request
↓
完整 Response
```

但是在 04 已经看到：

```text
stream:true
↓
很多 delta
```

不同 Provider 的 Streaming Event 也会不同。

这个问题留给下一节：

```text
08 · Unified Stream Events
```

---

## Done 标准

- [ ] 我能解释为什么 06 不抽象、07 才开始抽象。
- [ ] 我能解释 `LLMRequest` 的作用。
- [ ] 我能解释 `LLMResponse` 的作用。
- [ ] 我能解释 `Provider.chat()` 的作用。
- [ ] 我知道 DeepSeek / Anthropic 的协议差异被放进各自 Provider 内部。
- [ ] 我能指出 Usage 是怎么被统一成 `inputTokens / outputTokens / totalTokens` 的。
- [ ] 我能解释为什么替换 Provider 后 consumer 不需要修改。
- [ ] 我理解当前只统一非流式调用，Streaming 还没有解决。

做到这些，`llm:07` 就够了。

下一步进入 **08 · Unified Stream Events**。
