# 03 · Tool Registry / Router

状态：`PLANNED`

核心问题：**当工具越来越多时，为什么不能继续靠 `switch(toolName)`？**

最小 MVP：拆开 Tool Spec、Registry、Router、Handler、Runtime。

```text
Tool Spec
↓
Registry
↓
Router
↓
Handler
↓
Runtime
↓
Result
```

源码对照重点：Codex `core/src/tools/registry.rs`、`router.rs`、handlers / runtimes。

Done：新增一个 Tool 不需要修改中心 switch，并能解释注册、路由、执行三层的边界。
