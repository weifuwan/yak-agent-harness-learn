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

### 06 · Provider Differences

```bash
npm run llm:06 -- "请用三句话解释 Java HashMap"
```

### 07 · Unified LLM Interface

```bash
npm run llm:07 -- "请用三句话解释 Java HashMap"
```

DeepSeek 使用：

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

没有 `ANTHROPIC_API_KEY` 时，会只运行 DeepSeek。

独立说明：[`07-unified-llm-interface/README.md`](./07-unified-llm-interface/README.md)

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
05 Token / Context Window ✅
06 Provider Differences   ✅
07 Unified LLM Interface  ← 当前
08                       ← 暂时不展开
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

运行：

```bash
npm run llm:02 -- "解释一下 HashMap"
```

---

# 03 · Multi-turn Messages

核心问题：**模型为什么看起来能记住上一轮？**

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
stream:false → message.content
stream:true  → delta.content → 拼成完整 Assistant
```

运行：

```bash
npm run llm:04 -- "请详细解释 Java HashMap 的工作原理"
```

独立说明：[`04-streaming/README.md`](./04-streaming/README.md)

---

# 05 · Token / Context Window

核心问题：**Multi-turn History 可以一直无限增长吗？**

```text
Token
= 模型读取和生成文本的基本单位

Context Window
= 一次请求能够处理的上下文容量
```

```text
History 变长
↓
prompt_tokens 增加
↓
逐渐逼近 Context Window
```

运行：

```bash
npm run llm:05 -- "Java HashMap"
```

独立说明：[`05-token-context/README.md`](./05-token-context/README.md)

---

# 06 · Provider Differences

核心问题：**同样都是调用 LLM，换一个 Provider 后，底层协议还一样吗？**

```text
Provider = 谁提供模型服务
Model    = 具体调用哪个模型
API      = 通过什么协议调用
```

这一节故意把 DeepSeek / Anthropic 两套调用并排写出来：

```text
                DeepSeek                    Anthropic
Endpoint        /chat/completions           /v1/messages
System          messages role=system        body.system
Assistant       choices[0].message.content  content[].text
Input usage     prompt_tokens               input_tokens
Output usage    completion_tokens           output_tokens
```

目标不是解决差异，而是先看见：

```text
业务能力相同
↓
Provider 协议不同
↓
重复和差异开始出现
```

运行：

```bash
npm run llm:06 -- "请用三句话解释 Java HashMap"
```

详细说明：[`06-provider-differences/README.md`](./06-provider-differences/README.md)

---

# 07 · Unified LLM Interface

核心问题：**怎么让上层业务代码不再关心 DeepSeek / Anthropic 的协议差异？**

06 已经出现真实重复：

```text
DeepSeek URL / Body / Response / Usage
Anthropic URL / Body / Response / Usage
```

所以 07 才开始第一次抽象。

## 统一输入

```ts
LLMRequest = {
  system?: string
  messages: ChatMessage[]
}
```

## 统一输出

```ts
LLMResponse = {
  content: string
  usage: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
}
```

## 统一 Provider 接口

```ts
interface Provider {
  name: string
  model: string

  chat(request: LLMRequest): Promise<LLMResponse>
}
```

于是 consumer 只需要：

```text
Provider
↓
provider.chat(request)
↓
LLMResponse
```

具体协议被留在：

```text
DeepSeekProvider
AnthropicProvider
```

内部。

最重要的实验是：

```ts
await runProvider(deepSeek, request)
await runProvider(anthropic, request)
```

换了 Provider，但 `runProvider()` 不需要改。

运行：

```bash
npm run llm:07 -- "请用三句话解释 Java HashMap"
```

代码：

```text
07-unified-llm-interface/
├── types.ts
├── deepseek-provider.ts
├── anthropic-provider.ts
├── index.ts
└── README.md
```

详细说明：[`07-unified-llm-interface/README.md`](./07-unified-llm-interface/README.md)

这一阶段先记住：

> **抽象不是提前设计出来的，而是从已经出现的重复和变化点里提取出来的。**

以及：

```text
LLM 能力
= 上层稳定需求

Provider 协议
= 底层可替换实现
```

当前只统一非流式调用：

```text
完整 Request
↓
完整 Response
```

Streaming 事件还没有统一，留给 `08`。

---

## 当前 Done 标准

### 01 Basic Call

- [ ] 我能解释一次请求发送了什么。
- [ ] 我知道 Assistant Text 从哪里取出来。

### 02 Message Roles

- [ ] 我能解释 `system / user / assistant`。
- [ ] 我能区分 message role 和 persona。

### 03 Multi-turn Messages

- [ ] 我知道每一轮仍然是一次新的模型请求。
- [ ] 我能解释为什么要重新发送 History。

### 04 Streaming

- [ ] 我能解释 `stream:false / stream:true`。
- [ ] 我知道 `message.content / delta.content` 的区别。

### 05 Token / Context Window

- [ ] 我能用自己的话解释 Token。
- [ ] 我能解释 Context Window。
- [ ] 我观察过 History 增长后 `prompt_tokens` 的变化。

### 06 Provider Differences

- [ ] 我能解释 Provider 和 Model 的区别。
- [ ] 我能说出 DeepSeek 和 Anthropic 至少 3 个协议差异。
- [ ] 我理解为什么 06 故意不做抽象。

### 07 Unified LLM Interface

- [ ] 我能解释为什么现在才需要 Provider 接口。
- [ ] 我能解释 `LLMRequest / LLMResponse`。
- [ ] 我能解释 `Provider.chat()`。
- [ ] 我知道 Provider-specific 协议放在哪里。
- [ ] 我能解释为什么换 Provider 后 consumer 不需要修改。
- [ ] 我知道当前还没有统一 Streaming。

等 07 真正理解以后，再进入 **08 · Unified Stream Events**。
