# 06 · Prompt Spec

> 核心问题：**Prompt 越来越复杂以后，怎样把 Prompt 本身变成结构化、可维护的规范？**

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`Library → Prompt`

## 为什么需要 PromptSpec？

05 结束后 Prompt 已经包含：

```text
intro
component catalog
rules
examples
output contract
```

如果继续写成一大段：

```ts
[
  "...",
  "...",
  "...",
].join("\n")
```

Prompt 会变成另一份难维护代码。

这一节新增：

```text
PromptSpec
```

## 能力累积

```text
01 Manual Prompt
+
02 Signature
+
03 Description
+
04 Group / Rules
+
05 Examples
+
06 PromptSpec
```

最小结构：

```text
PromptSpec
├── intro
├── rules
├── examples
└── outputContract
```

Component Catalog 仍然来自当前 ComponentScope。

## PromptSpec 也要校验

本节检查：

```text
intro 不能为空
rules 不能为空
example id 不能重复
example 必须符合 ComponentScope
outputContract 不能为空
```

固定构造一个 Broken PromptSpec：

```text
empty intro
empty rules
duplicate example id
empty outputContract
↓
INVALID
```

## 运行

```bash
npm run openui:03:06
```

重点看：

```text
Prompt Spec Validation
Local Broken PromptSpec
Rendered Prompt
Model Output
Runtime Validation
```

## 这一节还没解决什么？

现在 Prompt 已经结构化了。

但：

```text
renderSpec()
```

仍然写死在当前实验。

下一步要把：

```text
ComponentScope
+
PromptSpec
↓
Prompt
```

变成真正可复用的生成器。

下一节：

```text
07 · Minimal Prompt Generator
```
