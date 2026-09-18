# 02 · Component Metadata

> 核心问题：**模型知道组件名以后，怎么知道每个组件到底是干什么的？**

状态：`COMPLETE`

所属章节：`Component Library`

上一节只有：

```text
DataTable
Dialog
Button
```

虽然系统已经拥有组件名单，但 Model 仍然需要靠名字猜：

> **这个组件到底是干什么的？**

这一节只新增一个东西：

```text
description
```

---

## ① 从 Name 到 Metadata

上一节：

```ts
"DataTable"
```

这一节：

```ts
{
  name: "DataTable",
  description: "用于展示结构化、多行、多列的数据集合。"
}
```

同样的 10 个组件名，一个都不增删。

唯一变化：

> **System 开始显式定义组件语义。**

---

## ② 最小 Metadata

当前每个组件只有：

```text
name
description
```

例如：

```text
Button
→ 用于触发明确的用户操作

Input
→ 用于输入自由文本

Select
→ 用于从有限选项中选择一个值

Dialog
→ 用于需要用户集中处理或确认的模态交互
```

仍然没有：

```text
props schema
renderer reference
groups
examples
```

---

## ③ 实验

还是同一个需求：

```text
帮我做一个数据同步任务列表页面
```

但模型现在看到的不再只是：

```text
DataTable
Dialog
Button
```

而是：

```text
DataTable: 用于展示结构化、多行、多列的数据集合
Dialog: 用于需要用户集中处理或确认的模态交互
Button: 用于触发明确的用户操作
```

所以组件语义开始来自 Library，而不是只来自组件名字本身。

---

## ④ System 现在多知道了什么？

01 能回答：

```text
这个组件存在吗？
```

02 还能回答：

```text
这个组件在 Library 里被定义成什么？
```

程序会输出：

```text
component
libraryDescription
modelPurpose
```

让我们直接比较：

> Library 定义的语义 vs Model 在当前页面里的使用目的。

---

## ⑤ Metadata 还不是 Runtime Rule

这里要注意：

```text
description
= 自然语言语义
```

它可以帮助 Model 做更合适的选择。

但程序还不能可靠地判断：

```text
“DataTable 用来打开确认弹窗”
到底算不算语义违规？
```

因为 description 不是可执行规则。

所以当前边界：

```text
Name Validation
→ AVAILABLE

Metadata Lookup
→ AVAILABLE

Model Semantic Guidance
→ AVAILABLE

Automatic Semantic Enforcement
→ NOT AVAILABLE

Props Validation
→ NOT AVAILABLE

Renderer Mapping
→ NOT AVAILABLE
```

---

## ⑥ 运行

```bash
npm run openui:02:02
```

重点看：

```text
Component Library
Library Validation
Metadata Lookup
What Can We Validate?
```

---

## ⑦ 这一节拿回了什么？

01 拿回：

> **有哪些组件。**

02 再拿回：

> **这些组件是什么意思。**

但还没有拿回：

> **这些组件到底允许怎么配置。**

这就是下一节为什么需要 Props Schema。

---

## Done

跑完后能回答：

- [x] Component Metadata 比 Raw Names 多了什么？
- [x] 为什么 description 属于 System-owned knowledge？
- [x] Model 为什么不再只能靠组件名猜语义？
- [x] 为什么 description 还不是 Runtime Enforcement？
- [x] 为什么下一节需要 Props Schema？

全部能回答后，本节完成。

下一节：

```text
03 · Props Schema
```

下一节只增加一个问题：

> **一个组件允许有哪些 props，它们分别是什么类型？**
