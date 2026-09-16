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

DeepSeek 使用前面已有的：

```env
MODEL_API_KEY=
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
```

Anthropic 是可选的：

```env
ANTHROPIC_API_KEY=
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=claude-sonnet-5
```

不配置 `ANTHROPIC_API_KEY` 时，Anthropic 部分会自动跳过。

独立说明：[`06-provider-differences/README.md`](./06-provider-differences/README.md)

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
06 Provider Differences   ← 当前
07～08                    ← 暂时不展开
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

先认识：

```text
Provider = 谁提供模型服务
Model    = 具体调用哪个模型
API      = 通过什么协议调用
```

这一节用相同 Prompt 对比：

```text
DeepSeek
vs
Anthropic
```

重点看：

```text
Endpoint
Headers
Request Body
Assistant 取值路径
Usage 字段
```

例如：

```text
                DeepSeek                    Anthropic

Endpoint        /chat/completions           /v1/messages
System          messages role=system        body.system
Assistant       choices[0].message.content  content[].text
Input usage     prompt_tokens               input_tokens
Output usage    completion_tokens           output_tokens
```

当前故意保留两套调用代码，不做统一抽象。

因为现在只需要看到：

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

代码：[`06-provider-differences/index.ts`](./06-provider-differences/index.ts)

详细说明：[`06-provider-differences/README.md`](./06-provider-differences/README.md)

暂时不要引入：

```text
Provider interface ❌
Adapter            ❌
Factory            ❌
Provider Registry  ❌
Unified LLMEvent   ❌
```

这些问题留到下一节。

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
- [ ] 我知道不同 Provider 的 Endpoint / Body / Response 可能不同。
- [ ] 我能说出 DeepSeek 和 Anthropic 至少 3 个协议差异。
- [ ] 我理解为什么这一阶段故意不做统一接口。

等 06 真正理解以后，再进入 **07 · Unified LLM Interface**。
