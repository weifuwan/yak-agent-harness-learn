# 01 · Runtime Protocol

状态：`PLANNED`

核心问题：**为什么 UI 不应该直接依赖 Agent Runtime 内部对象？**

最小 MVP：定义一组稳定的 Command / Event 协议，让 UI 只通过协议驱动 Runtime。

```text
UI
↓ Command
Runtime
↓ Event
UI
```

源码对照重点：Codex `protocol`、`app-server-protocol` 中的 Op / Event 模型。

Done：能解释“Runtime 内部状态”和“UI 对外协议”为什么必须分开。
