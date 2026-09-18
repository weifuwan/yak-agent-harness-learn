# 03 · Library → Prompt

> 核心问题：**Component Library 已经存在于程序里，模型怎么知道自己能用哪些组件、应该怎样使用？**

这一节把组件元数据转换成模型可理解的 Prompt Representation。

例如：

```text
Button(label: string, variant?: "primary" | "secondary")
Card(children: Component[], title?: string)
DataTable(columns: Column[], data: Row[])
```

OpenUI 对照：

```text
packages/lang-core/src/parser/prompt.ts
ComponentPromptSpec
```

重点理解：

```text
真实组件
↓
Component Metadata
↓
Component Prompt Spec
↓
LLM
```

Done：能解释为什么 Component Registry 还需要一层 Prompt Spec。
