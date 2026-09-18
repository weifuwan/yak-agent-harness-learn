# 06 · Minimal Component Library

> 核心问题：**怎么把组件名、语义、Props、Reference 和分组收敛成一个最小可用 Component Library？**

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`Component Library`

前面 01～05 已经分别解决：

```text
01 Component Names
02 Metadata
03 Props Schema
04 Component Reference
05 Component Groups
```

但还有一个问题：

> **这些能力现在仍然散落在每个实验自己的数组、Map 和校验函数里。**

如果继续这样进入下一章，后面的 Prompt Generator、Parser、Runtime 都会重新认识一遍组件规则。

所以 06 不再增加新字段。

这一节只做一件事：

> **把前面已经确定的规则收敛成一个真正的 ComponentLibrary 边界。**

---

## ① 为什么还需要 Minimal Component Library？

05 结束时已经有完整信息：

```text
name
description
props
reference
group
```

但代码还是：

```text
definitions[]
implementations[]
groups[]

definitionByName
implementationById
groupById

validateProps()
resolveReference()
selectByGroups()
...
```

如果这些逻辑继续散落：

```text
Prompt Generator 自己查组件
Parser 自己查组件
Runtime 自己校验组件
Renderer 自己找实现
```

最终每一层都会产生一套自己的 Component Knowledge。

这正是 Harness 不应该出现的状态。

---

## ② 最小抽象

这一节新增：

```text
component-library.ts
```

核心对象：

```text
ComponentLibrary
├── validate()
├── assertValid()
├── listGroups()
├── list()
├── get(name)
├── validateUsage()
├── resolve(name)
└── scope(groups)
```

以及：

```text
ComponentScope
├── list()
├── get(name)
├── validateUsage()
└── resolve(name)
```

这里没有新增 Component Definition 字段。

Definition 仍然只是：

```text
ComponentDefinition
├── name
├── description
├── props
├── reference
└── group
```

---

## ③ ComponentLibrary 拥有什么确定性？

### Library Integrity

```text
validate()
↓
检查
├── duplicate group
├── duplicate component
├── duplicate implementation
├── unknown group
└── unresolved reference
```

所以 Library 自己先保证：

> **组件定义集合本身是合法的。**

---

### Component Lookup

以前每一节自己写：

```ts
new Map(...)
```

现在统一：

```text
library.get("Button")
library.list()
```

调用方不需要再维护自己的 Component Map。

---

### Props Validation

03 的规则重新收回来：

```text
required
type
enum
unknown prop
```

统一通过：

```text
library.validateUsage(...)
```

判断。

---

### Reference Resolution

04 的能力重新收回来：

```text
Button
↓
ui.button
↓
src/components/Button.tsx
↓
Button export
```

统一通过：

```text
library.resolve("Button")
```

完成。

---

### Group Scope

05 的能力重新收回来：

```text
library.scope([
  "layout",
  "data-display",
  "action"
])
```

得到：

```text
ComponentScope
```

Scope 之后：

```text
scope.list()
scope.validateUsage()
scope.resolve()
```

都只允许当前场景开放的组件。

---

## ④ 为什么还需要 ComponentScope？

完整 Library 是系统的全部能力：

```text
ComponentLibrary
= 所有组件
```

但一次模型请求只应该看到当前场景需要的能力：

```text
ComponentScope
= 本轮允许使用的组件子集
```

所以关系是：

```text
ComponentLibrary
↓
scope(activeGroups)
↓
ComponentScope
↓
Model
```

不是创建多个 Library。

而是：

> **一个完整 Library，多个不同 Scope。**

---

## ⑤ 本节实验

还是使用：

```text
帮我做一个数据同步任务列表页面
```

完整流程：

```text
groups
+
definitions
+
implementations
↓
ComponentLibrary
↓
validate / assertValid
↓
scope(layout + data-display + action)
↓
Scoped Components
↓
Model
↓
Component Usage
↓
scope.validateUsage()
↓
scope.resolve()
↓
真实实现身份
```

这一次：

> Model、Prompt、Runtime 不再自己维护组件规则。

组件规则都从 `ComponentLibrary` 来。

---

## ⑥ Local Invalid Cases

固定验证两个问题。

### Scope 越界

```text
Dialog
↓
group = overlay
↓
当前 Scope 未开放
↓
REJECTED
```

### Props 错误

```text
Button
label = 123
variant = rainbow
↓
wrong type
invalid enum
↓
REJECTED
```

这证明：

```text
Group Scope
+
Props Schema
```

已经由同一个 ComponentLibrary 边界负责。

---

## ⑦ Local Broken Library

还会故意增加：

```text
BrokenCard
├── group = missing-group
└── reference = ui.missing-card
```

预期：

```text
unknown-group
unresolved-reference
↓
INVALID
```

这样验证的不是 Model Output。

而是：

> **Library 自己也必须先合法。**

---

## ⑧ 运行

```bash
npm run openui:02:06
```

重点看：

```text
Library Validation
Library Scope
Model Output
Scope + Props Validation
Reference Resolution
Runtime Decision
Local Invalid Cases
Local Broken Library
What Was Consolidated?
```

---

## ⑨ 这一章最终收敛成什么？

```text
01 Names
     ↓
02 Metadata
     ↓
03 Props Schema
     ↓
04 Reference
     ↓
05 Groups
     ↓
06 ComponentLibrary
```

最后可以记成：

```text
ComponentLibrary
=
Model 可以选择什么
+
每个组件是什么意思
+
允许怎样配置
+
属于哪个能力组
+
最终对应哪个真实实现
+
系统怎样确定性校验这些规则
```

这和普通 React Components 目录不是一回事。

```text
React Components
= 真实 UI 实现

Component Library
= Harness 对这些 UI 能力建立的可描述、可选择、可验证边界
```

---

## ⑩ 这一节明确不做什么？

不做：

```text
Prompt Generator
UI Language
Parser
Runtime Expression
Renderer
React Render
```

尤其不做自动 Prompt。

现在只是提供：

```text
library.list()
scope.list()
```

下一章才研究：

> **怎样把 ComponentLibrary 自动转换成 Model 真正稳定可理解的 Prompt。**

---

## Done

跑完后能回答：

- [ ] 为什么 05 已经有完整组件信息，06 仍然需要存在？
- [ ] ComponentLibrary 和普通 React 组件目录有什么区别？
- [ ] `validate()` 和 `validateUsage()` 分别检查什么？
- [ ] `resolve()` 解决什么问题？
- [ ] 为什么是一个完整 Library + 多个 Scope？
- [ ] ComponentScope 为什么属于确定性 Harness，而不是 Model 决策？
- [ ] 为什么这一节没有继续增加新的 Component Definition 字段？

全部能回答后，`02 · Component Library` 就可以封板。

下一章：

```text
03 · Library → Prompt
```
