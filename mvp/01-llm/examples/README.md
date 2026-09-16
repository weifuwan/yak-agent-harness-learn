# LLM MVP 验证场景

先准备环境：

```bash
cp .env.example .env
# 填写 MODEL_API_KEY
npm install
```

## 1. 正常流式输出

```bash
npm run mvp:llm -- "用三句话解释 Provider Turn"
```

观察：`start → 多个 text-delta → finish`。

## 2. Provider 错误

把 `.env` 中的 `MODEL_API_KEY` 临时改成错误值，再运行同一命令。

观察：上层不会拿到 DeepSeek 的原始异常类型，只会收到统一的 `error` 事件。

## 3. 主动中断

运行后在模型还在输出时按 `Ctrl+C`。

观察：`AbortSignal` 从 CLI 穿过 `LLM` 传到 Provider，请求被取消，最后得到 `aborted=true` 的 `error` 事件。

## 4. Provider 可替换性

```bash
npm run test:llm
```

测试里用两个不同 Fake Provider 驱动同一份 consumer 代码，验证上层只依赖 `LLMEvent`，不依赖具体 Provider 协议。
