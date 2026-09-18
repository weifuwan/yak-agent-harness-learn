# 01 · Manual Component Prompt

> 核心问题：**ComponentLibrary 已经存在程序里，最直接怎么让 Model 知道这些组件？**

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`Library → Prompt`

## 为什么先从手工 Prompt 开始？

上一章已经有：

```text
ComponentLibrary
+
ComponentScope
```

程序知道：

```text
有哪些组件
每个组件是什么意思
允许哪些 props
属于哪个 group
对应哪个实现
```

但 Model 看不到内存里的对象。

最直接的方法就是：

> **手工把组件规则抄进 Prompt。**

## 这一节只新增什么？

```text
ComponentLibrary
↓
人工复制
↓
Prompt Text
↓
Model
```

例如手工写：

```text
Page: title:string required
DataTable: columns:string[] required
Button: label:string required ...
```

## 能力累积

```text
01 Manual Prompt
→ NEW
```

这一步先证明：

> Component Library 必须经过某种 Prompt Representation，Model 才能理解。

## 问题在哪里？

现在组件知识维护了两份：

```text
ComponentLibrary
一份

Manual Prompt
另一份
```

只要漏改一边：

```text
Library 已经有 StatusBadge
Prompt 忘了写 StatusBadge
↓
DRIFT
```

本节固定构造这个 Stale Prompt Case 来验证维护风险。

## 运行

```bash
npm run openui:03:01
```

重点看：

```text
Manual Prompt
Manual Sync Check
Local Stale Prompt Case
Model Output
Runtime Validation
```

## 这一节解决了什么？

证明：

```text
Library 在程序里
≠
Model 自动知道 Library
```

必须把它转换成 Prompt。

但手工复制不能长期维护。

下一节先解决一个更小的问题：

> **Props 怎么用统一、稳定、紧凑的格式表达？**

下一节：

```text
02 · Component Signature
```
