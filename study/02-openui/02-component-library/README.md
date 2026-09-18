# 02 · Component Library

> 核心问题：**为什么不能让 Model 每次都自己发明 Button、Card、Table？**

状态：`IMPLEMENTED · WAITING FOR FINAL RUN`

这一章只解决一个问题：

> **怎样把真实 UI 组件变成 Model 可选择、System 可验证的确定性能力集合？**

不碰 Parser，不碰 Runtime Expression，也不做真正 React Render。

## 学习路线

```text
01 Raw Component Names
↓
02 Component Metadata
↓
03 Props Schema
↓
04 Component Reference
↓
05 Component Groups
↓
06 Minimal Component Library
```

核心原则：

> **每一节保留上一节的确定性，只新增一个能力。**

## 能力累积

```text
01 name
   ↓
02 name + description
   ↓
03 name + description + props
   ↓
04 name + description + props + reference
   ↓
05 name + description + props + reference + group
   ↓
06 ComponentLibrary + ComponentScope
```

## 6 个知识点分别解决什么？

### 01 · Raw Component Names

核心问题：

> 系统怎么先规定“允许有哪些组件”？

拿回：

```text
Component Vocabulary
```

### 02 · Component Metadata

核心问题：

> Model 怎么知道每个组件是干什么的？

新增：

```text
description
```

### 03 · Props Schema

核心问题：

> Runtime 怎么判断组件配置是否合法？

新增：

```text
required
type
enum
unknown prop
```

### 04 · Component Reference

核心问题：

> 抽象组件怎么稳定连接到真实实现？

新增：

```text
reference
+
Implementation Registry
```

### 05 · Component Groups

核心问题：

> 组件越来越多以后，怎么缩小每轮 Model 的选择空间？

新增：

```text
group
+
scope
```

### 06 · Minimal Component Library

核心问题：

> 前面规则都齐了以后，怎么避免每一层自己维护一份组件知识？

收敛成：

```text
ComponentLibrary
+
ComponentScope
```

## 实现状态

```text
01 Raw Component Names       ✅ implemented / complete
02 Component Metadata        ✅ implemented / complete
03 Props Schema              ✅ implemented / waiting for run
04 Component Reference       ✅ implemented / waiting for run
05 Component Groups          ✅ implemented / waiting for run
06 Minimal Component Library ✅ implemented / waiting for run
```

运行：

```bash
npm run openui:02:01
npm run openui:02:02
npm run openui:02:03
npm run openui:02:04
npm run openui:02:05
npm run openui:02:06
```

## 最终得到什么？

```text
React Components
= 真实 UI 实现

ComponentLibrary
= Harness 对这些 UI 实现建立的
  可描述
  可选择
  可验证
  可分组
  可解析
  的能力边界
```

最终结构：

```text
Full Component Library
↓
ComponentLibrary.validate()
↓
ComponentLibrary.scope(groups)
↓
ComponentScope
↓
Model
↓
Component Usage
↓
ComponentScope.validateUsage()
↓
ComponentScope.resolve()
↓
真实实现身份
```

## 这一章没有解决什么？

还没有解决：

```text
ComponentLibrary
↓
怎么自动变成稳定 Prompt？
```

现在虽然可以：

```text
library.list()
scope.list()
```

但 Prompt 还是手工拼的。

所以进入下一章：

```text
03 · Library → Prompt
```

下一章的核心问题：

> **ComponentLibrary 已经在程序里了，怎么让 Model 稳定理解它？**
