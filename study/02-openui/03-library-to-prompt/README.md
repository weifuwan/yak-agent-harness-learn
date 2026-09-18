# 03 · Library → Prompt

> 核心问题：**ComponentLibrary 已经存在于程序里，Model 怎么稳定理解它？**

状态：`IMPLEMENTED · WAITING FOR FINAL RUN`

上一章解决：

```text
System 如何拥有稳定的 UI 能力边界？
```

这一章解决：

> **怎样把这套能力边界转换成 Model 可理解、可维护、不会与 Library 漂移的 Prompt？**

## 学习路线

```text
01 Manual Component Prompt
↓
02 Component Signature
↓
03 Description Injection
↓
04 Group / Rules
↓
05 Examples
↓
06 Prompt Spec
↓
07 Minimal Prompt Generator
```

原则：

> **每一节保留上一节的 Prompt 能力，只新增一个问题的答案。**

## 能力累积

```text
01 手工把组件抄进 Prompt
   ↓
02 用 Signature 稳定表达 Props
   ↓
03 注入 Description 表达语义
   ↓
04 注入 Group / Scope / Rules
   ↓
05 加入合法 Few-shot Examples
   ↓
06 Prompt 结构化成 PromptSpec
   ↓
07 ComponentPromptGenerator 自动生成
```

## 7 个知识点分别解决什么？

### 01 · Manual Component Prompt

```text
Library 在程序里
↓
Model 看不到
↓
手工复制进 Prompt
```

先证明需要 Prompt Representation，同时暴露双份维护问题。

### 02 · Component Signature

把：

```text
Props Schema
```

稳定变成：

```text
Button(label: string, variant?: "primary" | ...)
```

### 03 · Description Injection

把：

```text
怎么调用
+
什么时候调用
```

同时告诉 Model。

### 04 · Group / Rules

把上一章的：

```text
ComponentGroup
ComponentScope
```

也表达进 Prompt。

### 05 · Examples

让 Model 不只知道规则，还能看到：

```text
正确组件组合
+
正确输出形状
```

### 06 · Prompt Spec

把 Prompt 自己从字符串收敛成：

```text
intro
rules
examples
outputContract
```

### 07 · Minimal Prompt Generator

最终：

```text
ComponentScope
+
PromptSpec
↓
ComponentPromptGenerator
↓
Prompt
```

不再人工维护第二份组件规则。

## 实现状态

```text
01 Manual Component Prompt    ✅ implemented / waiting for run
02 Component Signature        ✅ implemented / waiting for run
03 Description Injection      ✅ implemented / waiting for run
04 Group / Rules              ✅ implemented / waiting for run
05 Examples                   ✅ implemented / waiting for run
06 Prompt Spec                ✅ implemented / waiting for run
07 Minimal Prompt Generator   ✅ implemented / waiting for run
```

## 运行

```bash
npm run openui:03:01
npm run openui:03:02
npm run openui:03:03
npm run openui:03:04
npm run openui:03:05
npm run openui:03:06
npm run openui:03:07
```

## 最终边界

这一章只负责：

```text
Component Knowledge
↓
Prompt Representation
```

不负责：

```text
UI Language
Parser
Runtime
Renderer
```

最终链路：

```text
ComponentLibrary
↓
ComponentScope
↓
ComponentPromptGenerator
+
PromptSpec
↓
Stable Prompt
↓
LLM
```

下一章的问题：

> **即使 Prompt 已经稳定，为什么还不能让 Model 直接自由生成 JSX？**

下一章：

```text
04 · UI Language / Parser
```
