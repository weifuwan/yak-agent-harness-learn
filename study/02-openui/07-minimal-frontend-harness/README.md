# 07 · Minimal Frontend Harness

核心问题：

> Library、Prompt Spec、Parser、Runtime、Renderer 都有了以后，怎样把它们组合成一个最小 Frontend Harness？

最终链路：

```text
User Prompt
↓
Component Library
↓
Library → Prompt
↓
LLM
↓
UI Language
↓
Parser
↓
Runtime
↓
Renderer
↓
Design System UI
```

OpenUI 对照：

```text
examples/harnesses/
```

这一节不追求做出 Yakable 产品，只验证：

```text
同一个组件库
同一个设计系统
同一种用户意图
↓
生成结果是否比自由生成更稳定、更可控
```

Done：能完整画出 Frontend Harness 的输入、约束、中间表示、Runtime 和最终渲染过程。

完成后再进入 Onlook，学习 Visual Editing。
