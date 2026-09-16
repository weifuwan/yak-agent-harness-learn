# 01 · LLM MVP

> 核心问题：**一次 Provider Turn 到底是什么？**

状态：`MVP_IMPLEMENTED / SOURCE_ANALYSIS_PENDING`

## 1. 它处在整个流程什么位置？

```text
Session / Agent
      ↓
     LLM
      ↓
Provider / Model
      ↓
Streaming Response
      ↓
   LLMEvent
      ↓
SessionProcessor
```

这个节点只负责把“调用模型”变成稳定、统一、可替换的系统能力。

## 2. 如果没有它，会出现什么问题？

如果上层直接调用不同 Provider SDK，Agent 会逐渐知道 OpenAI、Anthropic、Gemini、Copilot 等不同协议的认证、参数、Stream、错误和 Usage 格式。Provider 差异会污染 Agent / Session。

## 3. OpenCode 用什么思路解决？

目前先记录架构，不做逐行源码分析：

```text
StreamInput
    ↓
LLM Request Preparation
    ↓
Provider Runtime
    ↓
AI SDK / Native Runtime
    ↓
Adapter
    ↓
Unified LLMEvent
```

当前源码入口：

```text
packages/opencode/src/session/llm.ts
packages/opencode/src/session/llm/request.ts
packages/opencode/src/session/llm/ai-sdk.ts
```

OpenCode 的关键思路：上层只认识统一的 LLM 输入和 `LLMEvent`，不直接依赖具体 Provider 的事件协议。

## 4. 暂时不看源码，我的最小设计

第一版只支持一个真实 Provider：DeepSeek Chat Completions。

```text
User
 ↓
LLM.stream()
 ↓
DeepSeekProvider
 ↓
HTTP + SSE
 ↓
ProviderEvent
 ↓
LLMEvent
 ↓
Console
```

最小事件：

```text
start
text-delta
finish
error
```

暂时不做 Tool、Agent Loop、Session、Context、Memory、Compaction、Permission、Retry、Multi Provider。

## 5. MVP 实现

实现刻意不使用 AI SDK / OpenAI SDK，直接使用 Node `fetch`，这样可以看到完整 Provider Turn。

```text
src/
├── types.ts              # LLM / Provider 的最小契约
├── deepseek-provider.ts  # HTTP 请求 + SSE 解析
├── llm.ts                # ProviderEvent → LLMEvent
└── index.ts              # 最小 CLI consumer
```

核心边界：

```text
Consumer
   ↓ 只认识 LLMEvent
  LLM
   ↓ 只认识 Provider interface
Provider
   ↓
DeepSeek HTTP / SSE
```

`DeepSeekProvider` 负责 Provider-specific 的 URL、Authorization、请求体、SSE 和响应 JSON；`LLM` 只负责把 Provider 输出转成统一事件，并把异常也收口成统一 `error` 事件。

## 6. 验证场景

见 `examples/README.md`。

自动测试：

```bash
npm run test:llm
```

真实调用：

```bash
cp .env.example .env
# 填写 MODEL_API_KEY
npm install
npm run mvp:llm -- "用一句话解释 Provider Turn"
```

当前测试验证：

- 正常 Provider Stream → `LLMEvent`；
- Provider 异常 → 统一 `error`；
- `AbortSignal` 穿过 LLM 边界；
- 替换 Provider 后 consumer 不变化。

## 7. 回到 OpenCode 源码

下一步再做。MVP 跑通后重点分析：

```text
packages/opencode/src/session/llm.ts
packages/opencode/src/session/llm/request.ts
packages/opencode/src/session/llm/ai-sdk.ts
```

目标不是逐行读，而是回答：OpenCode 在我们的 MVP 之外，为什么还需要 Request Preparation、Provider Transform、AI SDK / Native Runtime 双路径以及更完整的事件协议。

## 8. 我的 MVP vs OpenCode

TODO：等真实跑过 MVP 后再写。

## 9. 为什么 OpenCode 比我的 MVP 复杂？

TODO：等源码级分析后再写。

## Done

- [x] 能解释 Provider / Provider Turn / LLM / Agent 的区别。
- [x] 能解释 Request Preparation 的作用。
- [x] 能解释为什么使用 Stream。
- [x] 能解释为什么需要统一 `LLMEvent`。
- [x] 完成自己的 `LLM.stream()`。
- [ ] 完成源码对比。
