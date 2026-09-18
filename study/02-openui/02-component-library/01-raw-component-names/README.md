# 01 · Raw Component Names

> 核心问题：**如果只告诉模型允许哪些组件名，能不能先阻止它随便发明组件？**

状态：`COMPLETE`

所属章节：`Component Library`

> 如果系统只给 Model 一份“允许使用的组件名”，能拿回什么确定性？

前面的 No Harness 是：

```text
User Prompt
↓
Model
↓
Model 自己决定用什么组件
甚至可以自己发明组件
```

现在第一次加入：

```text
Allowed Component Names
```

## ① 最小 Component Library

这一节的 Library 故意只有名字：

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

没有：

```text
description
props schema
renderer reference
component groups
examples
```

## ② 实验

需求：

```text
帮我做一个数据同步任务列表页面
```

这次告诉 Model：

> 只能从给出的组件名字中选择，不能发明新的组件名。

模型返回：

```text
page

components
├── component
└── purpose
```

## ③ Runtime 现在第一次能检查什么？

程序会做集合比较：

```text
Model Selected Components
↓
Allowed Component Names
↓
unknown components
```

所以我们第一次拥有了一个程序可以判断的问题：

> **这个组件名允许不允许？**

## ④ 但只有名字还不够

假设 Model 返回：

```text
DataTable
purpose = 用来弹出创建任务窗口
```

从名字白名单看：

```text
DataTable ∈ Library
→ PASS
```

但系统还无法判断这个用途到底对不对。

因为 Library 只有名字，没有组件语义。

因此当前能力边界是：

```text
Name Validation
→ AVAILABLE

Semantic Validation
→ NOT AVAILABLE

Props Validation
→ NOT AVAILABLE

Renderer Mapping
→ NOT AVAILABLE
```

## ⑤ 运行

```bash
npm run openui:02:01
```

重点看：

```text
library size
used components
unknown components
Selected Components
What Can We Validate?
```

## ⑥ 这一节拿回了什么？

只拿回一小块：

> **组件词汇表的所有权。**

以前：

```text
“有哪些组件？”
→ Model 决定
```

现在：

```text
“有哪些组件？”
→ System / Library 决定
```

但：

```text
“这个组件到底是什么意思？”
→ 仍然主要靠 Model 猜
```

## Done

跑完后能回答：

- [x] Raw Component Names 比 No Harness 多了什么？
- [x] 为什么组件白名单已经是一种 System-owned Constraint？
- [x] 系统现在能检查什么？
- [x] 为什么名字合法不代表组件使用正确？
- [x] 为什么下一节需要 Component Metadata？

全部能回答后，本节完成。

下一节：

```text
02 · Component Metadata
```

下一节只增加一个东西：

> **给组件名字补上“它到底是干什么的”。**
