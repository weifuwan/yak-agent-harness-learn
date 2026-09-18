# 01 · Raw Component Names · Results

## 实验条件

```text
Provider : DeepSeek
Model    : deepseek-flash
Request  : 帮我做一个数据同步任务列表页面
Library  : 10 个允许组件
Runs     : 1
```

允许组件：

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

## 数据

模型实际使用：

```text
library size       : 10
used components    : 10
unknown components : 0
```

结果：

```text
ALL_COMPONENT_NAMES_ALLOWED
```

也就是：

> Model 输出的所有组件名都属于 System 定义的 Component Library。

## 当前能验证什么？

```text
组件名是否允许？
→ YES

组件用途是否正确？
→ NOT AVAILABLE

组件 props 是否合法？
→ NOT AVAILABLE

组件映射到哪个真实 React 实现？
→ NOT AVAILABLE
```

## 观察

这一步已经拿回一小块确定性：

```text
以前：
“有哪些组件？”
→ Model 决定

现在：
“有哪些组件？”
→ System / Library 决定
```

但这次 Model 把 10 个组件全部用了，也暴露了 Raw Names 的边界：

> 系统只告诉了 Model“有什么”，还没有告诉它“什么时候该用、什么时候不该用”。

当前 Model 仍然主要依靠组件名称本身去猜语义。

## 结论

> Raw Component Names 拿回的是“组件词汇表的所有权”。

但：

> 名字合法，不代表使用正确。

所以下一步需要：

```text
02 · Component Metadata
```

给组件名字补上：

> **这个组件到底是干什么的。**
