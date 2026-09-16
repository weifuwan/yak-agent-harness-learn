# 06 · Provider Differences

核心问题：**同样都是调用 LLM，换一个 Provider 后，底层协议还一样吗？**

答案：不一定。

这一节先不解决差异，只把差异看清楚。

---

## 新词：Provider

可以先理解成：

> **提供模型调用能力的服务方。**

例如：

```text
DeepSeek
Anthropic
OpenAI
Google
```

Provider 和 Model 不一样：

```text
Provider = 谁提供服务
Model    = 具体调用哪个模型
API      = 通过什么协议去调用
```

---

## 这次实验做什么？

同一个 User Prompt：

```text
请用三句话解释 Java HashMap。
```

分别调用：

```text
Provider A: DeepSeek
Provider B: Anthropic
```

然后直接比较：

```text
URL
Headers
Request Body
Assistant 取值路径
Usage 字段
```

这里故意把两个调用分别写出来，不做 Provider interface，不做 Adapter。

因为当前目标是：

> **先看到真实差异，再决定后面为什么需要抽象。**

---

## 运行

DeepSeek 沿用前面的配置：

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

只配 DeepSeek 也可以运行，Anthropic 会自动跳过。

执行：

```bash
npm run llm:06 -- "请用三句话解释 Java HashMap"
```

---

## DeepSeek 请求长什么样？

当前使用 OpenAI-compatible Chat Completions 风格：

```text
POST /chat/completions
```

Body 大致是：

```json
{
  "model": "deepseek-flash",
  "messages": [
    {
      "role": "system",
      "content": "你是一个简洁、准确的 Java 编程老师。"
    },
    {
      "role": "user",
      "content": "请用三句话解释 Java HashMap。"
    }
  ],
  "stream": false
}
```

Assistant 从这里取：

```text
choices[0].message.content
```

Usage 常见字段：

```text
prompt_tokens
completion_tokens
total_tokens
```

---

## Anthropic 请求长什么样？

Messages API 的 Endpoint 是：

```text
POST /v1/messages
```

一个很明显的区别是：System Prompt 不一定放进 `messages`，而是单独放在：

```text
body.system
```

Body 大致是：

```json
{
  "model": "claude-sonnet-5",
  "max_tokens": 512,
  "system": "你是一个简洁、准确的 Java 编程老师。",
  "messages": [
    {
      "role": "user",
      "content": "请用三句话解释 Java HashMap。"
    }
  ],
  "stream": false
}
```

Assistant 也不是：

```text
choices[0].message.content
```

而是从内容块里取：

```text
content[]
↓
type = text
↓
text
```

Usage 字段也变成：

```text
input_tokens
output_tokens
```

---

## 重点对比

```text
                DeepSeek                    Anthropic

Endpoint        /chat/completions           /v1/messages

System          messages role=system        body.system

Assistant       choices[0].message.content  content[].text

Input usage     prompt_tokens               input_tokens

Output usage    completion_tokens           output_tokens
```

注意：两边解决的业务问题其实一样：

```text
Prompt / Messages
↓
Model
↓
Assistant
```

但是 Provider-specific 的协议细节不一样。

---

## 为什么现在不抽象？

因为如果只有一个 Provider：

```text
App
↓
DeepSeek
```

直接调用就够了。

当第二个 Provider 出现：

```text
        ┌→ DeepSeek
App ────┤
        └→ Anthropic
```

代码开始出现：

```text
两套 URL
两套 Request Body
两套 Response 解析
两套 Usage 字段
```

这时候“统一接口”的问题才真正出现。

所以：

```text
06 Provider Differences
= 先看到问题

07 Unified LLM Interface
= 再解决问题
```

---

## 当前不要解决

```text
Provider interface   ❌
Adapter              ❌
Factory               ❌
Provider Registry     ❌
Unified LLMEvent      ❌
```

允许代码重复。

这一节重复代码反而是学习材料。

---

## Done 标准

- [ ] 我能解释 Provider 和 Model 的区别。
- [ ] 我知道不同 Provider 的 Endpoint 可能不同。
- [ ] 我知道 Request Body 可能不同。
- [ ] 我知道 Response Body 可能不同。
- [ ] 我知道 Usage 字段也可能不同。
- [ ] 我能说出 DeepSeek 和 Anthropic 至少 3 个协议差异。
- [ ] 我理解为什么现在先不做统一抽象。

做到这些，`llm:06` 就够了。

下一步进入 **07 · Unified LLM Interface**。
