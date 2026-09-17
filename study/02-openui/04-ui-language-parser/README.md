# 04 · UI Language / Parser

核心问题：

> 为什么不让模型直接输出任意 React JSX？

这一节引入一个最小 UI 中间表示，并把模型输出解析成结构化 UI。

目标链路：

```text
LLM Output
↓
UI Language
↓
Parser
↓
AST / UI Tree
```

重点验证：

```text
未知组件能否拒绝
非法 Props 能否发现
嵌套结构能否稳定解析
```

OpenUI 对照：

```text
packages/lang-core/src/parser/
```

Done：能解释 Parser 为什么是 Harness 的确定性边界之一。
