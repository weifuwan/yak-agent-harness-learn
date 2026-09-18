# 05 · Examples

> 核心问题：**规则已经写清楚，Model 仍然不会稳定组合组件时怎么办？**

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`Library → Prompt`

## 为什么还需要 Examples？

现在 Prompt 已经有：

```text
Signature
Description
Groups
Rules
```

这些都属于：

```text
告诉 Model 规则
```

但 Model 还可能不知道：

```text
Page + DataTable + Button
应该怎样组合成一个完整计划
```

这一节新增：

```text
Few-shot Examples
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
```

示例包含：

```text
User Request
+
正确 JSON Answer
```

例如：

```text
做一个任务列表页，带新建按钮
↓
Page
DataTable
Button
```

## Examples 不是随便写

示例本身也是 Harness 的一部分。

所以必须先经过：

```text
ComponentScope.validateUsage()
```

如果示例里出现：

```text
Dialog
但当前 Scope 没有 overlay
```

示例本身就应该：

```text
REJECTED
```

不能把错误示例偷偷变成 Prompt 规则。

## 运行

```bash
npm run openui:03:05
```

重点看：

```text
Example Validation
Local Invalid Example Case
Prompt Examples
Model Output
Runtime Validation
```

## 这一节还没解决什么？

Prompt 现在已经包含很多块：

```text
intro
components
rules
examples
output contract
```

如果继续直接拼字符串，Prompt 自己也开始难维护。

下一节：

```text
06 · Prompt Spec
```
