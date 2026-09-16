# 01 · LLM MVP

> 核心问题：**一次 Provider Turn 到底是什么？**

状态：`LEARNING`

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

第一版只支持一个 Provider：

```text
User
 ↓
LLM.stream()
 ↓
One Provider
 ↓
SSE / Stream
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

TODO。目标约 100～300 行。

## 6. 验证场景

TODO。至少验证：

- 正常流式输出；
- Provider 返回错误；
- 用户主动中断 Stream；
- 后续替换 Provider 时，上层是否需要修改。

## 7. 回到 OpenCode 源码

等 MVP 跑通后再做源码级调用链分析。

## 8. 我的 MVP vs OpenCode

TODO。

## 9. 为什么 OpenCode 比我的 MVP 复杂？

TODO。

## Done

- [ ] 能解释 Provider / Provider Turn / LLM / Agent 的区别。
- [ ] 能解释 Request Preparation 的作用。
- [ ] 能解释为什么使用 Stream。
- [ ] 能解释为什么需要统一 `LLMEvent`。
- [ ] 完成自己的 `LLM.stream()`。
- [ ] 完成源码对比。
