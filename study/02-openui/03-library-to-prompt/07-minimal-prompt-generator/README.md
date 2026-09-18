# 07 · Minimal Prompt Generator

> 核心问题：**怎样从 ComponentLibrary 自动生成 Prompt，而不是继续维护两份组件规则？**

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`Library → Prompt`

## 为什么最后还需要 Generator？

前面已经得到：

```text
ComponentScope
PromptSpec
```

但如果每个调用点都自己：

```text
遍历 group
拼 signature
拼 description
拼 rules
拼 examples
拼 output contract
```

还是会重复。

所以最后收敛成：

```text
ComponentPromptGenerator
```

## 能力累积

```text
01 Manual Prompt
↓
02 Signature
↓
03 Description
↓
04 Group / Rules
↓
05 Examples
↓
06 PromptSpec
↓
07 ComponentPromptGenerator
```

最终输入：

```text
ComponentLibrary
+
ComponentScope
+
PromptSpec
+
User Request
```

输出：

```text
Final Prompt
```

## 最关键的自动同步

如果当前 Scope 从：

```text
layout + data-display + action
```

换成：

```text
form
```

不修改 Prompt 文本。

Generator 自动得到：

```text
Input
Select
```

并且不再出现：

```text
Button
```

这证明：

> **Prompt 的组件知识真正来自 ComponentLibrary，而不是复制出来的第二份事实。**

## 最小 API

```text
ComponentPromptGenerator.generate({
  request,
  scope,
  spec
})
↓
string prompt
```

Generator 只负责：

```text
Library / Scope
→ Prompt Representation
```

它不负责：

```text
调用 LLM
解析输出
执行 Runtime
渲染 React
```

## 运行

```bash
npm run openui:03:07
```

重点看：

```text
Generated Prompt
Local Auto-Sync Case
Model Output
Runtime Validation
What Was Consolidated?
```

## 这一章最终得到什么？

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

现在 Model 已经能稳定知道：

```text
有哪些组件
组件怎么调用
组件是什么意思
组件属于什么能力组
当前允许使用哪些组件
正确组合长什么样
输出必须遵循什么格式
```

下一章的问题自然出现：

> **Model 知道这些以后，为什么仍然不能让它自由输出 JSX？**

下一章：

```text
04 · UI Language / Parser
```
