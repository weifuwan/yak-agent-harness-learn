# 02 · Component Metadata

> 核心问题：**模型知道组件名以后，怎么知道每个组件到底是干什么的？**

状态：`COMPLETE`

所属章节：`Component Library`

## 为什么只有名字还不够？

上一节只有：

```text
DataTable
Dialog
Button
```

这只能告诉 Model：

> 这些名字可以用。

但不能告诉它：

> 分别应该在什么场景使用。

这一节只新增：

```text
description
```

## 能力累积

```text
01 name
+
02 description
```

Component 从：

```ts
"DataTable"
```

变成：

```ts
{
  name: "DataTable",
  description: "用于展示结构化、多行、多列的数据集合。"
}
```

## 最小实现

当前每个组件只有：

```text
name
description
```

例如：

```text
Button
→ 用于触发明确操作

Input
→ 输入自由文本

Dialog
→ 模态确认或集中交互
```

description 会进入 Prompt，所以 Model 不再只能靠名字猜。

## 固定边界 Case

### Unknown Component

固定测试：

```text
FancyTable
```

Library 中没有 metadata：

```text
metadata = MISSING
→ REJECTED
```

### Semantic Limitation

再固定演示：

```text
DataTable
purpose = 打开删除确认弹窗
```

程序可以拿到：

```text
library description
vs
model purpose
```

但当前不能自动判定语义对错。

因为：

```text
description
= 自然语言知识
≠ 可执行规则
```

## 运行

```bash
npm run openui:02:02
```

重点看：

```text
Component Library
Library Validation
Local Unknown Component Case
Semantic Limitation Case
Metadata Lookup
What Can We Validate?
```

## 这一节解决了什么？

01 拿回：

```text
有哪些组件
```

02 再拿回：

```text
这些组件是什么意思
```

但仍然不知道：

```text
Button 能接收哪些 props？
variant 能不能写 rainbow？
label 能不能传 number？
```

所以下一节进入：

```text
03 · Props Schema
```
