# 03 · Description Injection

> 核心问题：**只有 Component Signature 时，Model 怎么理解组件语义和适用场景？**

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`Library → Prompt`

## Signature 解决了什么？

现在 Model 能看到：

```text
DataTable(columns: string[], striped?: boolean)
Button(label: string, action: string, variant?: ...)
```

这能告诉它：

```text
怎么调用
```

但仍然不够清楚：

```text
什么时候用 DataTable？
什么时候用 Button？
```

这一节只新增：

```text
description injection
```

## 能力累积

```text
01 Manual Prompt
+
02 Signature
+
03 Description
```

Prompt 现在变成：

```text
DataTable(...)
  description: 用于展示结构化、多行、多列的数据集合

Button(...)
  description: 用于触发明确的用户操作
```

## 一个重要区别

```text
Signature
→ 调用结构

Description
→ 使用语义
```

两者一起出现，Model 才同时知道：

```text
这个组件怎么用
+
这个组件为什么用
```

## 运行

```bash
npm run openui:03:03
```

重点看：

```text
Prompt Representation
Semantic Contrast
Model Output
Runtime Validation
```

## 这一节还没解决什么？

现在组件仍然是：

```text
Page
Card
StatCard
DataTable
StatusBadge
Button
...
```

平铺给 Model。

组件继续增长以后，Prompt 仍然缺少能力层次。

下一节：

```text
04 · Group / Rules
```
