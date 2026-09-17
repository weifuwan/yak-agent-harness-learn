# Compaction 01 · No Compaction

> 核心问题：**Context 已经做过 Selection，但仍然超过预算，会发生什么？**

这一轮故意不实现任何 Compaction。

运行：

```bash
npm run compaction:01
```

当前流程：

```text
Session
↓
Context Runtime
↓
History Selection
↓
Safe Context Units
↓
Model Context
↓
大小仍然超过预算
```

默认场景：

```text
Session: 20 个 Context Unit
↓
Context Policy: recent_units:12
↓
只保留最近 12 个 Unit
↓
仍然超过演示 Token Budget
```

所以这一轮要看到：

> **Context Selection 能解决“选哪些”，但不能保证“选出来的一定装得下”。**

## 为什么不能继续简单减少 Unit？

因为这里故意假设：

```text
最近 12 个 Unit
= 当前任务仍然需要保留的信息
```

如果继续：

```text
12 → 5
```

虽然 Context 变短，但可能直接丢失仍然需要的事实。

这和 Compaction 要解决的问题不同。

```text
Selection
= 不带某些信息

Compaction
= 信息仍然保留，但换成更短的表示
```

## Token 为什么只是估算？

这一轮只需要稳定制造 overflow 问题，所以用学习版估算：

```text
estimated tokens ≈ characters / 4
```

它不是精确 tokenizer，也不代表任何 Provider 的真实计费规则。

这一轮不研究：

```text
Provider tokenizer
精确 Context Window
shouldCompact()
Hot / Cold
Summary
Compaction Runtime
```

这些都留给后面。

## 当前要记住

```text
Context Selection 已经正确
≠
Model Context 一定足够短
```

可以记成：

```text
01 = Overflow Problem
```

下一轮：

```text
compaction:02 · Compaction Trigger
```

才开始回答：

> **什么时候应该触发 Compaction？**
