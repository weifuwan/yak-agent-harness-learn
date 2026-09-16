# 01 · Basic Call

> 核心问题：**一次最简单的大模型调用，到底发生了什么？**

## 流程

```text
User Prompt
    ↓
POST /chat/completions
    ↓
Model
    ↓
JSON Response
    ↓
Assistant Text
```

## 这一阶段只看什么？

请求里只保留最基本内容：

```json
{
  "model": "...",
  "messages": [
    {
      "role": "user",
      "content": "用户的问题"
    }
  ]
}
```

响应里我们也只关心一件事：

```text
choices[0].message.content
```

## 为什么故意不封装？

现在只有一个 Provider、一次请求、一个响应。

还没有出现需要 `LLM` class、Provider Adapter、Stream Event 的问题，所以不要提前抽象。

## 运行

```bash
cp .env.example .env
# 填写 MODEL_API_KEY
npm install
npm run llm:01 -- "用一句话解释 HashMap"
```

建议直接打开 `index.ts`，对照真实请求和真实响应来看。
