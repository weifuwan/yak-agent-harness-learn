# 02 · Component Library

核心问题：

> 模型为什么不能每次都自己发明 Button、Card、Table？

这一节只建立一个最小组件库，不碰 Parser 和 Runtime。

最小目标：

```text
Library
├── Button
├── Card
└── DataTable
```

重点理解：

```text
真实组件
↓
组件元数据
↓
模型可选择的能力集合
```

OpenUI 对照：

```text
packages/lang-core/src/library.ts
packages/react-lang/src/library.ts
```

Done：能解释 Component Library 与普通 React 组件目录的区别。
