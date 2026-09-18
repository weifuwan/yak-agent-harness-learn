# 05 · Component Groups

> 核心问题：**组件越来越多以后，怎么组织它们，避免每次把全部能力平铺给模型？**

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`Component Library`

前面已经有：

```text
name
description
props
reference
```

但组件数量继续增长以后，会出现一个新问题：

> **是不是每次都要把整个 Component Library 全部暴露给 Model？**

这一节只新增一个能力：

```text
group
```

---

## ① 没有 Group 会怎样？

现在 Library 只有 10 个组件，看起来还不多：

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

但如果以后变成：

```text
50 个
100 个
300 个组件
```

每次都全部暴露给 Model：

```text
选择空间越来越大
↓
无关组件越来越多
↓
Prompt 越来越长
↓
误选机会越来越多
```

所以需要在完整 Library 上再增加一层组织边界。

---

## ② 最小设计

这一节把组件分成：

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
Card        → layout

StatCard    → data-display
DataTable   → data-display
StatusBadge → data-display

Button      → action

Input       → form
Select      → form

Tabs        → navigation
Dialog      → overlay
```

完整 Component Definition 现在变成：

```text
name
description
props
reference
group
```

---

## ③ 这一节不做“智能选 Group”

当前需求还是：

```text
帮我做一个数据同步任务列表页面
```

这一节直接由 System 明确指定：

```text
active groups
=
layout
+ data-display
+ action
```

所以：

```text
Full Library
10 components
↓
Group Selection
layout + data-display + action
↓
Scoped Library
6 components
↓
Model
```

Model 看不到：

```text
Input
Select
Tabs
Dialog
```

这里故意不研究：

> **系统怎样自动判断应该选择哪些 Groups？**

这一节只证明：

> **完整能力集合可以被确定性地缩小。**

---

## ④ 为什么 Group Selection 属于 System？

如果又让 Model 自己决定：

```text
我要不要看 form？
我要不要看 overlay？
我要不要看 navigation？
```

那么“缩小选择空间”本身又变成了 Model-owned Decision。

所以当前设计是：

```text
System
决定本轮开放哪些 Groups
↓
Model
只在开放范围里选择组件
```

后面如果要做动态 Group Routing，也应该由 Harness 提供明确机制，而不是让 Model 随意访问全部能力。

---

## ⑤ Runtime 仍然要校验

只缩小 Prompt 还不够。

即使 Model 理论上看不到 `Dialog`，Runtime 仍然检查：

```text
Model Output
↓
找到 Component Definition
↓
检查 component.group
↓
是否属于 activeGroups？
├── YES → ALLOWED
└── NO  → REJECTED
```

所以：

> **Prompt Scope 是第一层限制，Runtime Validation 是最后一道确定性边界。**

---

## ⑥ Local Out-of-Scope Case

固定构造：

```text
Dialog
group = overlay
```

但当前只开放：

```text
layout
data-display
action
```

预期：

```text
Dialog
↓
overlay 未开放
↓
REJECTED
```

这样可以验证 Group 不只是分类标签，而是真正参与 Runtime 决策。

---

## ⑦ 运行

```bash
npm run openui:02:05
```

重点看：

```text
Component Groups
Full Component Library
Active Groups
Scoped Component Library
Model Output
Group Scope Validation
Runtime Decision
Local Out-of-Scope Case
```

最关键的数字：

```text
full component count   : 10
scoped component count : 6
hidden component count : 4
```

---

## ⑧ 这一节拿回了什么？

前面：

```text
01 有哪些组件
02 组件是什么意思
03 组件允许怎么配置
04 组件对应哪个真实实现
```

现在：

```text
05 当前场景允许 Model 看见哪些组件
```

于是 Component Library 已经形成：

```text
name
description
props
reference
group
```

下一节不再继续加新字段。

下一节要做的是：

> **把前面这些零散能力收敛成一个真正的 Minimal Component Library。**

---

## Done

跑完后能回答：

- [ ] Component Groups 解决的是什么问题？
- [ ] 为什么完整 Library 仍然保留？
- [ ] 为什么 Model 不应该永远看到全部组件？
- [ ] activeGroups 和完整 Library 是什么关系？
- [ ] 为什么 Prompt 缩小以后 Runtime 仍然需要校验？
- [ ] 为什么这一节暂时不做自动 Group Routing？

全部能回答后，本节完成。

下一节：

```text
06 · Minimal Component Library
```
