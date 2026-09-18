# 06 · Renderer / Design System

> 核心问题：**Runtime 已经算出 UI 状态以后，怎么稳定渲染成真实界面，同时不把视觉风格重新交给模型？**

> 同一棵 UI Tree，怎样稳定渲染成真实 React UI，并保持统一视觉系统？

这一节把 Runtime 输出交给 Renderer，并引入最小 Design System。

目标链路：

```text
UI Tree
↓
Runtime
↓
Renderer
↓
React Components
↓
Design System
```

OpenUI 对照：

```text
packages/react-lang/src/Renderer.tsx
packages/react-lang/src/library.ts
examples/design-systems/
```

重点验证：

```text
相同语义结构
+
不同 Design System
↓
页面结构稳定，视觉实现可替换
```

Done：能解释 Harness 如何把“语义”与“视觉实现”分开。
