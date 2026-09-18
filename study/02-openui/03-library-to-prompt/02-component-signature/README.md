# 02 · Component Signature

> 核心问题：**怎样用稳定格式描述组件名和 Props，让 Model 更容易正确调用组件？**

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`Library → Prompt`

## 为什么手写 Props 文本不够？

01 可以写：

```text
Button: label:string required, action:string required...
```

但格式完全靠人：

```text
required
optional
enum
array
```

很容易写得不一致。

这一节只新增：

```text
Component Signature
```

## 能力累积

```text
01 Manual Prompt
+
02 Signature
```

例如：

```text
Button(
  label: string,
  action: string,
  variant?: "primary" | "secondary" | "danger"
)
```

规则：

```text
required prop
→ 没有 ?

optional prop
→ 有 ?

enum
→ "a" | "b" | "c"
```

## 关键变化

Signature 不再手写 Props。

而是直接读取：

```text
ComponentDefinition.props
↓
toSignature()
↓
Prompt
```

所以 Props Schema 改动后，Signature 会跟着变。

## 固定验证

本节会固定检查 Button：

```text
label: string
action: string
variant?: "primary" | "secondary" | "danger"
```

验证：

```text
required 是否保留
optional 是否有 ?
enum 是否完整
```

## 运行

```bash
npm run openui:03:02
```

重点看：

```text
Component Signatures
Local Signature Check
Model Output
Runtime Validation
```

## 这一节还没解决什么？

Signature 主要告诉 Model：

> **怎么调用组件。**

但不能很好回答：

> **为什么、什么时候应该选择这个组件。**

下一节：

```text
03 · Description Injection
```
