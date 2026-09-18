# 01 · Raw Component Names

> 核心问题：**如果完全没有组件边界，Model 会不会自己发明 UI 组件？**

状态：`COMPLETE`

所属章节：`Component Library`

## 为什么先从 Names 开始？

No UI Harness 时：

```text
User Prompt
↓
Model
↓
Button / Table / Modal / FancyGrid / Anything...
```

“有哪些组件”完全由 Model 决定。

这一节只新增：

```text
Allowed Component Names
```

也就是第一次把一个前端决定从 Model 手里拿回来。

## 能力累积

```text
01 Names
→ NEW
```

当前系统只知道：

```text
Page
Card
StatCard
DataTable
StatusBadge
Button
Input
Select
Dialog
Tabs
```

还不知道：

```text
这些组件是什么意思
允许哪些 props
对应哪个真实实现
属于哪个 group
```

## 最小实现

代码里只有：

```ts
const componentNames = [...]
const allowedComponents = new Set(componentNames)
```

Model 只能从名单里选择。

Runtime 做最简单的判断：

```text
component ∈ allowedComponents ?
├── YES → allowed
└── NO  → rejected
```

## 固定失败 Case

本节固定测试：

```text
FancyTable
```

它不在 Library 中，所以无论 Model 是否真的犯错，都能验证：

```text
FancyTable
↓
NOT IN LIBRARY
↓
REJECTED
```

## 运行

```bash
npm run openui:02:01
```

重点看：

```text
Component Library
Name-Level Validation
Local Unknown Component Case
Selected Components
What Can We Validate?
```

## 这一节解决了什么？

拿回了：

> **组件词汇表的所有权。**

以前：

```text
有哪些组件？
→ Model 决定
```

现在：

```text
有哪些组件？
→ System 决定
```

但名字合法不代表用法正确。

例如：

```text
DataTable
purpose = 打开删除确认弹窗
```

名字合法，但系统还不知道这是不是正确用途。

所以下一节自然出现：

> **组件名字有了，Model 怎么知道每个组件到底是干什么的？**

下一节：

```text
02 · Component Metadata
```
