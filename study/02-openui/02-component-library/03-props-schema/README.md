# 03 · Props Schema

> 核心问题：**知道组件用途以后，怎么限制 Model 只能使用合法 Props？**

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`Component Library`

## 为什么 Metadata 还不够？

现在已经有：

```text
name
description
```

但 description 只能告诉 Model：

> 这个组件是干什么的。

它不能告诉 Runtime：

> 这个配置到底允不允许。

这一节只新增：

```text
props schema
```

## 能力累积

```text
01 name
+
02 description
+
03 props schema
```

例如：

```text
Button

label   : string required
action  : string required
variant : string enum(primary|secondary|danger)
```

## 最小 Schema

当前只支持：

```text
string
number
boolean
string[]
required
enum
```

已经足够表达核心配置约束。

## Runtime 能检查什么？

```text
unknown prop
missing required prop
wrong type
invalid enum
```

例如：

```text
Button
label   = 123
action  = missing
variant = rainbow
magic   = true
```

会得到：

```text
wrong type
missing required
invalid enum
unknown prop
↓
REJECTED
```

这个失败 Case 是本地固定构造，不依赖 LLM 恰好犯错。

## 运行

```bash
npm run openui:02:03
```

重点看：

```text
Cumulative Capability
Component Library
Model Output
Props Validation
Runtime Decision
Local Invalid Case
What Can We Validate?
```

## 这一节解决了什么？

现在 Library 已经拥有：

```text
组件存在性
组件语义
组件配置契约
```

但仍然不知道：

```text
Button
最终对应项目里的哪个真实 Button？
```

所以即使 Props 合法，也还没有真实实现身份。

下一节：

```text
04 · Component Reference
```
