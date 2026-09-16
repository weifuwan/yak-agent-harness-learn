# 01 · LLM 学习

> 按 LLM 应用能力的演进顺序学习：每次只增加一个问题和一个能力。

当前原则：**没有遇到问题之前，不提前引入答案。**

## 快速测试

第一次运行：

```bash
npm install
cp .env.example .env
```

DeepSeek：

```env
MODEL_API_KEY=
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
```

Kimi / Moonshot 中国区 Open Platform：

```env
KIMI_API_KEY=
KIMI_BASE_URL=https://api.moonshot.cn/v1
KIMI_MODEL=kimi-k3
```

国际版 Open Platform：

```env
KIMI_BASE_URL=https://api.moonshot.ai/v1
```

> 06～08 只配置 DeepSeek 或只配置 Kimi 都能运行；没配置的 Provider 会自动跳过。

---

## 运行命令

```bash
npm run llm:01 -- "用一句话解释 HashMap"
npm run llm:02 -- "解释一下 HashMap"
npm run llm:03 -- "我叫什么？"
npm run llm:04 -- "请详细解释 Java HashMap 的工作原理"
npm run llm:05 -- "Java HashMap"
npm run llm:06 -- "请用三句话解释 Java HashMap"
npm run llm:07 -- "请用三句话解释 Java HashMap"
npm run llm:08 -- "请用一小段话解释 Java HashMap，控制在 120 字以内"
```

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
07 Unified LLM Interface  ✅
08 Unified Stream Events  ← 当前
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

```bash
npm run llm:02 -- "解释一下 HashMap"
```

---

# 03 · Multi-turn Messages

核心问题：**模型为什么看起来能记住上一轮？**

> **Multi-turn 最基础的实现，就是应用保存 History，并在下一轮重新发送。**

```bash
npm run llm:03 -- "我叫什么？"
```

详细说明：[`03-multi-turn/README.md`](./03-multi-turn/README.md)

---

# 04 · Streaming

核心问题：**模型回答比较慢时，能不能生成一点，就先返回一点？**

```text
stream:false → message.content
stream:true  → delta.content → 拼成完整 Assistant
```

```bash
npm run llm:04 -- "请详细解释 Java HashMap 的工作原理"
```

详细说明：[`04-streaming/README.md`](./04-streaming/README.md)

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

```bash
npm run llm:05 -- "Java HashMap"
```

详细说明：[`05-token-context/README.md`](./05-token-context/README.md)

---

# 06 · Provider Differences

核心问题：**Provider 不同，Protocol 一定不同吗？**

先区分：

```text
Provider = 谁提供模型服务
Model    = 具体调用哪个模型
Protocol = API 请求 / 响应遵循什么规范
```

本节对比：

```text
DeepSeek
vs
Kimi / Moonshot
```

这次会发现：

```text
                  DeepSeek              Kimi
Provider          DeepSeek              Moonshot / Kimi
Protocol          OpenAI-compatible     OpenAI-compatible
Endpoint Host     api.deepseek.com      api.moonshot.cn
Auth              Bearer                Bearer
Assistant         choices[0]...content  choices[0]...content
Usage             prompt/completion     prompt/completion
```

所以关键结论是：

> **Provider 不同，不代表 Protocol 一定不同。**

即使协议高度相似，仍然存在不同的：

```text
Base URL
API Key
Model
模型能力
价格 / 配额
Provider-specific 扩展
```

```bash
npm run llm:06 -- "请用三句话解释 Java HashMap"
```

详细说明：[`06-provider-differences/README.md`](./06-provider-differences/README.md)

---

# 07 · Unified LLM Interface

核心问题：**怎么让上层业务代码不依赖具体 Provider？**

统一输入：

```ts
LLMRequest = {
  system?: string
  messages: ChatMessage[]
}
```

统一输出：

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

统一 Provider：

```ts
interface Provider {
  name: string
  model: string
  chat(request: LLMRequest): Promise<LLMResponse>
}
```

当前实现：

```text
DeepSeekProvider
KimiProvider
```

consumer 始终只调用：

```ts
provider.chat(request)
```

换 Provider，consumer 不需要改。

```bash
npm run llm:07 -- "请用三句话解释 Java HashMap"
```

详细说明：[`07-unified-llm-interface/README.md`](./07-unified-llm-interface/README.md)

---

# 08 · Unified Stream Events

核心问题：**怎么让 consumer 不依赖 Provider 的原始 Streaming 数据？**

定义最小统一事件：

```ts
type LLMEvent =
  | { type: "start"; provider: string; model: string }
  | { type: "text-delta"; text: string }
  | { type: "finish" }
```

Provider 对外统一：

```ts
stream(request: LLMRequest): AsyncIterable<LLMEvent>
```

consumer：

```ts
for await (const event of provider.stream(request)) {
  // 只处理 start / text-delta / finish
}
```

当前 DeepSeek 和 Kimi 都兼容 OpenAI Chat Completions Streaming，所以原始文字流都很相似：

```text
choices[0].delta.content
...
data: [DONE]
```

但 consumer 仍然不直接依赖这些外部字段。

结构是：

```text
DeepSeek raw stream
        ↓
DeepSeekProvider
        ↓
      LLMEvent
        ↑
KimiProvider
        ↑
Kimi raw stream
```

所以：

```text
07
固定“调用完成后拿到什么”

08
固定“生成过程中看到什么”
```

```bash
npm run llm:08 -- "请用一小段话解释 Java HashMap，控制在 120 字以内"
```

当前目录：

```text
08-unified-stream-events/
├── types.ts
├── deepseek-provider.ts
├── kimi-provider.ts
├── index.ts
└── README.md
```

详细说明：[`08-unified-stream-events/README.md`](./08-unified-stream-events/README.md)

---

## 当前 Done 标准

### 01～05

- [ ] 我理解一次调用、Message Role、Multi-turn、Streaming、Token、Context Window。

### 06 Provider Differences

- [ ] 我能区分 Provider / Model / Protocol。
- [ ] 我知道 DeepSeek 和 Kimi 是不同 Provider，但都兼容 OpenAI Chat Completions。
- [ ] 我知道 Provider 不同不代表协议一定不同。

### 07 Unified LLM Interface

- [ ] 我能解释 `LLMRequest / LLMResponse / Provider.chat()`。
- [ ] 我能解释为什么换 DeepSeek / Kimi 后 consumer 不需要修改。

### 08 Unified Stream Events

- [ ] 我能解释 `start / text-delta / finish`。
- [ ] 我能解释 `AsyncIterable<LLMEvent>`。
- [ ] 我能看懂 `for await...of` 如何消费流事件。
- [ ] 我知道 Provider 负责把原始 Stream 转换成统一 LLMEvent。
- [ ] 我能解释为什么 DeepSeek / Kimi 虽然流式协议很像，内部事件边界仍然有价值。

等 08 真正理解以后，`01-LLM` 这一轮基础学习就可以先封板。
