# 06 · Minimal Component Library

> 核心问题：**怎么把前面 01～05 的规则收敛成一个真正可复用的 ComponentLibrary？**

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`Component Library`

## 为什么还需要 06？

05 结束后 Definition 已经完整：

```text
name
description
props
reference
group
```

但实现仍然散落：

```text
definitions[]
implementations[]
groups[]

Map
validateProps()
resolveReference()
selectByGroups()
```

如果直接进入下一章：

```text
Prompt Generator 自己查组件
Parser 自己查组件
Runtime 自己校验组件
Renderer 自己解析实现
```

每一层都会重新维护一套 Component Knowledge。

所以 06 不新增 Definition 字段。

只做：

> **收敛。**

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
↓
06 ComponentLibrary
```

## 最小抽象

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

## ComponentLibrary 负责什么？

### Library Integrity

```text
duplicate group
duplicate component
duplicate implementation
unknown group
unresolved reference
```

### Usage Validation

```text
unknown component
inactive group
missing required prop
wrong prop type
invalid enum
unknown prop
```

### Reference Resolution

```text
Button
↓
ui.button
↓
src/components/Button.tsx
```

### Scope

```text
完整 Library
↓
scope(activeGroups)
↓
ComponentScope
↓
Model
```

核心关系：

> **一个完整 Library，多个不同 Scope。**

## 固定失败 Case

### Scope 越界

```text
Dialog
→ overlay 未开放
→ REJECTED
```

### Props 错误

```text
Button
label = 123
variant = rainbow
→ REJECTED
```

### Broken Library

```text
BrokenCard
├── group = missing-group
└── reference = ui.missing-card
```

得到：

```text
unknown-group
unresolved-reference
↓
INVALID
```

## 运行

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
Local Invalid Cases
Local Broken Library
What Was Consolidated?
```

## Component Library 到这里是什么？

```text
React Components
= 真实 UI 实现

ComponentLibrary
= Harness 对 UI 能力建立的
  可描述
  可选择
  可验证
  可解析
  的确定性边界
```

## 这一章到这里封什么板？

```text
01 有哪些组件
02 组件是什么意思
03 组件允许怎么配置
04 组件对应哪个真实实现
05 当前场景能看到哪些组件
06 把所有规则收敛成统一边界
```

下一章不再研究“组件是什么”。

下一章研究：

> **怎样把 ComponentLibrary 自动转换成 Model 能稳定理解的 Prompt。**

下一章：

```text
03 · Library → Prompt
```
