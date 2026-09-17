# 06 · Compaction 学习

> 核心问题：**Context 已经知道该保留什么，但这些必须保留的信息本身还是太长，怎么办？**

当前状态：`LEARNING`

核心边界：

```text
Context
= 决定这一轮放哪些信息

Compaction
= 这些应该保留的信息太长时，换成更短的表示
```

所以：

> **Selection 解决“选哪些”，Compaction 解决“选出来以后还是太长”。**

---

## 学习路线

```text
01 No Compaction
   ↓
02 Compaction Trigger
   ↓
03 Hot / Cold Context
   ↓
04 Summarize Cold Context
   ↓
05 Rebuild Compacted Context
   ↓
06 Minimal Compaction Runtime
```

当前进度：

```text
01 No Compaction              ← 当前
02 Compaction Trigger         ← 后续
03 Hot / Cold Context         ← 后续
04 Summarize Cold Context     ← 后续
05 Rebuild Compacted Context  ← 后续
06 Minimal Compaction Runtime ← 后续
```

---

# Compaction 01 · No Compaction

核心问题：

> **Context Runtime 已经做过 Selection，但最终 Model Context 还是超过预算，会发生什么？**

运行：

```bash
npm run compaction:01
```

这一轮直接复用上一章已经完成的 Context Runtime：

```text
Session
↓
prepareContext()
↓
History Selection
↓
Safe Context Units
↓
Model Context
```

默认构造：

```text
Session
= 20 个 Context Unit
```

Context Policy 已经选择：

```text
recent_units:12
```

所以不是把 20 个全部发送，而是：

```text
20 Units
↓
Context Selection
↓
12 Units
```

但这 12 个 Unit 本身内容就很长。

这一轮再用一个学习版大小估算：

```text
estimated tokens ≈ characters / 4
```

和固定演示预算比较：

```text
Token Budget = 2000
```

重点观察：

```text
selected units
selected history messages
estimated tokens
token budget
within budget
```

如果输出：

```text
within budget: false
```

就说明问题已经出现。

---

## 为什么这不是 Context Selection 的问题？

因为当前已经明确：

```text
最近 12 个 Unit
= 当前任务仍然需要保留的信息
```

如果继续简单：

```text
12 → 5
```

虽然 Context 会变短，但可能直接丢掉仍然需要的事实。

所以：

```text
Selection
= 某些信息不进入 Context

Compaction
= 信息仍然进入，但换成更短的表示
```

这一轮不实现压缩，只先把这个边界看清楚。

可以记成：

```text
01 = Overflow Problem
```

详细：[`01-no-compaction/README.md`](./01-no-compaction/README.md)

---

## 为什么下一步是 Compaction Trigger？

现在已经看到：

```text
Model Context
↓
可能超过预算
```

新的问题是：

> **什么时候应该启动 Compaction？**

不能每次请求都压缩，也不能等模型调用已经失败以后才临时处理。

所以下一轮进入：

```text
compaction:02 · Compaction Trigger
```

第一次引入类似：

```text
estimate size
↓
compare budget
↓
should compact?
```

但 `compaction:01` 暂时不提前实现这个判断函数。

---

## 当前不进入

```text
Hot / Cold
Summary
LLM Compaction
多级摘要
RAG
Embedding
长期 Memory
复杂 Provider Tokenizer
```

这些等问题真正出现以后再逐步引入。

---

## 当前 Done 标准

### Compaction 01

- [ ] 我能区分 Context Selection 和 Compaction。
- [ ] 我知道 Selection 已经完成后，Context 仍然可能超过预算。
- [ ] 我知道继续减少 Unit 可能会丢失仍然需要的信息。
- [ ] 我知道 Compaction 的方向不是“再删一些”，而是“更短地表示”。
- [ ] 我知道当前 Token 只是学习版估算，不是 Provider 精确 tokenizer。
- [ ] 我知道这一轮没有实现任何压缩。
- [ ] 我知道下一步为什么要研究 Compaction Trigger。

做到这些，就进入 **compaction:02 · Compaction Trigger**。
