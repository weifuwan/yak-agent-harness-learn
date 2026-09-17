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
01 No Compaction              ✅
02 Compaction Trigger         ← 当前
03 Hot / Cold Context         ← 后续
04 Summarize Cold Context     ← 后续
05 Rebuild Compacted Context  ← 后续
06 Minimal Compaction Runtime ← 后续
```

---

# Compaction 01 · No Compaction

运行：

```bash
npm run compaction:01
```

这一轮复用 Context Runtime：

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

默认场景已经只选择最近 12 个 Unit，但这些必须保留的内容本身仍然超过演示 Budget。

所以第一次看到：

```text
Selection 已经正确
+
Context 仍然 Overflow
```

记成：

```text
01 = Problem
```

详细：[`01-no-compaction/README.md`](./01-no-compaction/README.md)

---

# Compaction 02 · Compaction Trigger

核心问题：

> **什么时候应该正式进入 Compaction？**

运行：

```bash
npm run compaction:02
```

这一轮第一次把“人工看到超预算”变成 Runtime 判断：

```ts
shouldCompact(estimatedTokens, tokenBudget)
```

流程：

```text
Model Context
↓
estimateContextTokens()
↓
shouldCompact()
↓
├── false → CONTINUE
└── true  → COMPACT
```

默认运行两个对照场景。

### Case A · Within Budget

```text
较小 Context
↓
estimatedTokens <= budget
↓
shouldCompact = false
↓
CONTINUE
```

### Case B · Over Budget

```text
较大 Context
↓
estimatedTokens > budget
↓
shouldCompact = true
↓
COMPACT
```

注意：

```text
COMPACT
```

现在只是**决策结果**。

这一轮没有真正修改 Context，也没有生成 Summary。

记成：

```text
02 = Trigger
```

详细：[`02-compaction-trigger/README.md`](./02-compaction-trigger/README.md)

---

## 前两轮连起来

```text
compaction:01
Context 超预算
↓
Problem

compaction:02
Runtime 判断是否超预算
↓
Trigger
```

也就是：

```text
01 = Problem
02 = Trigger
```

---

## 为什么下一步是 Hot / Cold Context？

现在 Runtime 已经可以得到：

```text
shouldCompact = true
```

新的问题马上出现：

> **既然要压，所有 Context 都一起压吗？**

最近正在工作的历史通常需要保持原样，而较旧但仍重要的信息才更适合压缩。

所以下一轮进入：

```text
compaction:03 · Hot / Cold Context
```

第一次把已经选中的 Context Units 拆成：

```text
Cold Units
= 较旧，可考虑压缩

Hot Units
= 最近正在使用，原样保留
```

这一轮仍然不会真正 Summary。

---

## 当前仍然不进入

```text
Summary
LLM Compaction
Context Rebuild
多级摘要
RAG
Embedding
长期 Memory
复杂 Provider Tokenizer
```

---

## 当前 Done 标准

### Compaction 01

- [ ] 我知道 Selection 完成后 Context 仍然可能太长。
- [ ] 我能区分 Selection 和 Compaction。

### Compaction 02

- [ ] 我能解释 `shouldCompact()` 为什么存在。
- [ ] 我知道 Budget 是工程使用额度，不是模型物理上限。
- [ ] 我知道 `estimatedTokens <= budget` 时继续正常流程。
- [ ] 我知道 `estimatedTokens > budget` 时进入 Compaction 分支。
- [ ] 我知道 Trigger 只回答“该不该压”，不回答“怎么压”。
- [ ] 我知道当前 Token 仍是学习版近似估算。
- [ ] 我知道下一步为什么需要区分 Hot / Cold Context。

做到这些，就进入 **compaction:03 · Hot / Cold Context**。
