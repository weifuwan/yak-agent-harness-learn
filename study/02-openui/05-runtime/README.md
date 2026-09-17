# 05 · Runtime

核心问题：

> Parser 已经得到 UI Tree，谁负责让这棵树真正运行起来？

这一节只做最小 Runtime：

```text
UI Tree
↓
Runtime
↓
Component Lookup
↓
Props / Children Resolution
↓
Renderable Structure
```

OpenUI 对照：

```text
packages/lang-core/src/runtime/
packages/react-lang/src/runtime/
```

重点理解：

```text
Parser = 理解结构
Runtime = 执行结构
```

Done：能解释为什么 Parser 和 Renderer 中间还需要 Runtime。
