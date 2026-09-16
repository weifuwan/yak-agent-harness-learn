# 06 · Provider Differences

核心问题：**换一个 Provider 后，底层协议一定会完全不同吗？**

答案：不一定。

这一节使用两个真实 Provider：

```text
DeepSeek
Kimi / Moonshot
```

它们是不同的模型服务提供方，但这次会看到一个很重要的事实：

> **DeepSeek 和 Kimi 都提供 OpenAI-compatible Chat Completions API，所以简单聊天协议高度相似。**

---

## 先区分三个词

```text
Provider = 谁提供模型服务
Model    = 具体调用哪个模型
Protocol = 请求 / 响应遵循什么 API 规范
```

所以：

```text
Provider 不同
≠
Protocol 一定不同
```

DeepSeek 和 Kimi 就是很好的例子。

---

## 配置

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

如果你的 API Key 来自国际版 `platform.kimi.ai`：

```env
KIMI_BASE_URL=https://api.moonshot.ai/v1
```

只配置其中一个 Key 也能运行；没有配置的 Provider 会自动跳过。

> 本节针对 Kimi / Moonshot Open Platform API。Kimi Code 订阅中的 `sk-kimi-*` Key 属于另一套产品和 endpoint，不是这里使用的 Open Platform API。

---

## 运行

```bash
npm run llm:06 -- "请用三句话解释 Java HashMap"
```

---

## DeepSeek

请求大致是：

```text
POST https://api.deepseek.com/chat/completions
Authorization: Bearer ...
```

```json
{
  "model": "deepseek-flash",
  "messages": [
    { "role": "system", "content": "你是一个简洁、准确的 Java 编程老师。" },
    { "role": "user", "content": "请用三句话解释 Java HashMap" }
  ],
  "stream": false
}
```

Assistant：

```text
choices[0].message.content
```

Usage：

```text
prompt_tokens
completion_tokens
total_tokens
```

---

## Kimi / Moonshot

请求大致是：

```text
POST https://api.moonshot.cn/v1/chat/completions
Authorization: Bearer ...
```

请求 Body 仍然是 OpenAI-compatible Chat Completions：

```json
{
  "model": "kimi-k3",
  "messages": [
    { "role": "system", "content": "你是一个简洁、准确的 Java 编程老师。" },
    { "role": "user", "content": "请用三句话解释 Java HashMap" }
  ],
  "stream": false
}
```

Assistant 同样是：

```text
choices[0].message.content
```

Usage 也使用：

```text
prompt_tokens
completion_tokens
total_tokens
```

---

## 这次真正要观察什么？

```text
                  DeepSeek                 Kimi

Provider          DeepSeek                 Moonshot / Kimi
Protocol          OpenAI-compatible        OpenAI-compatible
Host              api.deepseek.com         api.moonshot.cn
Endpoint          /chat/completions        /v1/chat/completions
Auth              Bearer                   Bearer
Assistant         choices[0]...content     choices[0]...content
Usage             prompt/completion/...    prompt/completion/...
Model             deepseek-*               kimi-*
```

这和原先拿 Anthropic 对比时不同。

这次最重要的新认识是：

> **Provider 是服务商边界，Protocol 是协议边界。两者不是一回事。**

两个 Provider 可以共享同一种协议，但仍然有不同的：

```text
Base URL
API Key
Model 名称
模型能力
价格 / 配额
Provider-specific 扩展
错误和限流策略
```

---

## 为什么 07 仍然有意义？

你可能会问：

> “既然 DeepSeek 和 Kimi 都是 OpenAI-compatible，那还需要 Provider interface 吗？”

需要理解的是，上层依赖的应该是：

```text
我要调用一个 LLM
```

而不是：

```text
我要调用 api.deepseek.com
```

即使今天两个 Provider 协议相似，Provider 本身仍然是可替换的运行时依赖。

07 会把：

```text
API Key
Base URL
Model
Provider-specific 请求 / 响应处理
```

关进 Provider 实现里。

---

## 当前不要做

```text
Provider Registry          ❌
自动模型路由               ❌
Fallback                   ❌
重试                       ❌
统一所有 OpenAI-compatible ❌
```

这里甚至故意保留一些 DeepSeek / Kimi 重复代码。

先看清楚边界，再继续抽象。

---

## Done 标准

- [ ] 我能解释 Provider / Model / Protocol 的区别。
- [ ] 我知道不同 Provider 不一定使用不同协议。
- [ ] 我知道 DeepSeek 和 Kimi 都提供 OpenAI-compatible Chat Completions。
- [ ] 我能指出两者相同的 Request / Response 结构。
- [ ] 我能指出两者仍然不同的 Base URL / Model / API Key 等配置。
- [ ] 我理解为什么 Provider 边界仍然值得存在。

做到这些，`llm:06` 就够了。

下一步：**07 · Unified LLM Interface**。
