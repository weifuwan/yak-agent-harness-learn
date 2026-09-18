# 04 · Group / Rules

> 核心问题：**组件越来越多以后，怎样把 ComponentScope 和能力分组也表达给 Model？**

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`Library → Prompt`

## 为什么平铺组件还不够？

03 已经有：

```text
signature
+
description
```

但组件还是一个长列表。

上一章已经建立：

```text
ComponentGroup
ComponentScope
```

如果 Prompt 不表达这些边界，Model 仍然感知不到。

这一节新增：

```text
group sections
+
explicit rules
```

## 能力累积

```text
01 Manual Prompt
+
02 Signature
+
03 Description
+
04 Group / Rules
```

Prompt 现在按能力组织：

```text
## layout
Page(...)
Card(...)

## data-display
StatCard(...)
DataTable(...)
StatusBadge(...)

## action
Button(...)
```

同时明确：

```text
只能使用当前 Scope
props 必须符合 Signature
不输出 group
不输出 reference
```

## 固定 Scope Case

完整 Library 还有：

```text
Input
Select
Tabs
Dialog
```

但当前 Scope 没开放它们。

本节会检查：

```text
Dialog visible?
→ NO
```

证明 Prompt 已经跟 ComponentScope 对齐。

## 运行

```bash
npm run openui:03:04
```

重点看：

```text
Active Groups
Grouped Prompt Catalog
Local Scope Check
Model Output
Runtime Validation
```

## 这一节还没解决什么？

规则写得再清楚，Model 仍然可能不知道：

```text
多个组件应该怎样组合
最终 JSON 长什么样
一个完整页面通常怎么组织
```

下一节增加少量正确示例。

下一节：

```text
05 · Examples
```
