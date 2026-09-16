# 07 · Unified LLM Interface

核心问题：**上层业务代码能不能不关心具体 Provider？**

在 06 里已经看到：

```text
DeepSeek
Kimi / Moonshot
```

是两个不同 Provider，但它们都提供 OpenAI-compatible Chat Completions。

这意味着：

```text
Provider 不同
↓
协议可能相同
↓
但服务方配置和运行时依赖仍然不同
```

所以 07 仍然要建立一个稳定边界：

> **consumer 只依赖我们的统一 LLM 接口，不直接依赖 DeepSeek 或 Kimi。**

---

## 统一输入：LLMRequest

```ts
type LLMRequest = {
  system?: string
  messages: ChatMessage[]
}
```

上层只描述：

```text
System Prompt
Conversation Messages
```

不关心：

```text
Base URL
API Key
Model 名称
Provider-specific HTTP 细节
```

---

## 统一输出：LLMResponse

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

consumer 不直接读取：

```text
choices[0].message.content
prompt_tokens
completion_tokens
```

这些由 Provider 实现负责翻译。

---

## Provider 接口

```ts
interface Provider {
  readonly name: string
  readonly model: string

  chat(request: LLMRequest): Promise<LLMResponse>
}
```

当前两个实现：

```text
DeepSeekProvider
KimiProvider
```

它们当前内部代码比较相似，是因为两边都兼容 OpenAI Chat Completions。

这里先不要急着继续抽一个：

```text
OpenAICompatibleProvider ❌
```

因为当前学习目标不是继续压缩重复，而是看清 **Provider 边界**。

---

## consumer 为什么不变？

核心 consumer：

```ts
async function runProvider(provider: Provider, input: LLMRequest) {
  const response = await provider.chat(input)

  console.log(response.content)
  console.log(response.usage)
}
```

调用 DeepSeek：

```ts
await runProvider(deepSeek, request)
```

调用 Kimi：

```ts
await runProvider(kimi, request)
```

`runProvider()` 完全不需要知道：

```text
api.deepseek.com
api.moonshot.cn
DeepSeek API Key
Kimi API Key
deepseek-* model
kimi-* model
```

---

## 配置

DeepSeek：

```env
MODEL_API_KEY=
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
```

Kimi 中国区：

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
npm run llm:07 -- "请用三句话解释 Java HashMap"
```

只配置 Kimi 也能跑；只配置 DeepSeek 也能跑。

---

## 这一节真正要理解什么？

### 06

看见 Provider：

```text
DeepSeek
Kimi
```

虽然协议相似，但服务方不同。

### 07

把具体 Provider 隔离到统一接口后面：

```text
Consumer
    ↓
Provider.chat(request)
    ↓
┌──────────────┬──────────────┐
↓              ↓
DeepSeek       Kimi
Provider       Provider
```

所以：

> **Provider interface 的价值，不只是在“协议不同”时存在，也在于隔离可替换的外部服务依赖。**

---

## 为什么不直接写一个 OpenAI-compatible Client？

现在当然已经能看到重复：

```text
DeepSeekProvider
KimiProvider
```

内部很多代码一样。

但当前原则仍然是：

> **没有遇到下一个真实问题之前，不继续抽象。**

等以后 Provider 数量继续增加，才讨论：

```text
OpenAICompatibleProvider
Provider Config
Provider Registry
```

---

## 当前只统一非流式调用

```text
完整 Request
↓
完整 Response
```

核心形态：

```ts
await provider.chat(request)
```

Streaming 过程还没有统一，留给 `08`。

---

## Done 标准

- [ ] 我能解释为什么 Provider 不同但协议可以相同。
- [ ] 我能解释 `LLMRequest / LLMResponse`。
- [ ] 我能解释 `Provider.chat()`。
- [ ] 我知道 DeepSeek / Kimi 的 API Key、Base URL、Model 被隔离在哪里。
- [ ] 我能解释为什么换 Provider 后 consumer 不需要修改。
- [ ] 我知道现在还没有统一 Streaming。

做到这些，`llm:07` 就够了。

下一步：**08 · Unified Stream Events**。
