# 05 · Component Groups

> 核心问题：**组件越来越多以后，怎么缩小 Model 每一轮面对的选择空间？**

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`Component Library`

## 为什么需要 Groups？

现在已经有：

```text
name
description
props
reference
```

如果以后 Library 从 10 个组件增长到：

```text
50
100
300
```

每次全部塞给 Model：

```text
Prompt 更长
无关组件更多
选择空间更大
误选概率更高
```

这一节只新增：

```text
group
```

## 能力累积

```text
01 name
+
02 description
+
03 props schema
+
04 reference
+
05 group
```

05 仍然保留 Props Validation 和 Reference Resolution。

## 最小分组

```text
layout
data-display
action
form
navigation
overlay
```

例如：

```text
Page        → layout
DataTable   → data-display
Button      → action
Input       → form
Tabs        → navigation
Dialog      → overlay
```

当前数据同步列表场景只开放：

```text
layout
data-display
action
```

于是：

```text
Full Library
10 components
↓
Group Scope
↓
Scoped Library
6 components
↓
Model
```

## 为什么 Group Selection 先由 System 决定？

这一节暂时不做自动 Routing。

否则如果又让 Model 决定：

```text
我要不要看 form？
我要不要看 overlay？
```

缩小选择空间本身又变成了 Model Decision。

所以现在：

```text
System
→ 指定 activeGroups

Model
→ 只在 Scope 中选组件
```

## 固定失败 Case

### Out-of-Scope

```text
Dialog
group = overlay
activeGroups 不包含 overlay
↓
REJECTED
```

### Invalid Props

```text
Button
label = 123
variant = rainbow
↓
REJECTED
```

这证明 05 是在 01～04 上继续增加能力，而不是替换旧能力。

## 运行

```bash
npm run openui:02:05
```

重点看：

```text
Cumulative Capability
Library Validation
Component Groups
Full Component Library
Active Groups
Scoped Component Library
Model Output
Group + Props + Reference Validation
Local Invalid Cases
```

## 这一节解决了什么？

现在系统拥有完整能力集合，也能产生：

```text
Component Scope
= 当前场景允许使用的组件子集
```

但目前这些规则仍然散落在：

```text
arrays
maps
validate functions
resolve functions
scope functions
```

下一节不再增加字段，而是把它们收敛成一个真正的对象。

下一节：

```text
06 · Minimal Component Library
```
