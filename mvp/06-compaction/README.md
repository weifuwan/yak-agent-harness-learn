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
02 Compaction Trigger         ✅
03 Hot / Cold Context         ← 当前
04 Summarize Cold Context     ← 后续
05 Rebuild Compacted Context  ← 后续
06 Minimal Compaction Runtime ← 后续
```

---

# 01 · No Compaction

运行：

```bash
npm run compaction:01
```

这一轮故意不压缩，只稳定制造：

```text
Context Selection 已经完成
+
Selected Context 仍然超过 Budget
```

所以：

```text
01 = Problem
```

详细：[`01-no-compaction/README.md`](./01-no-compaction/README.md)

---

# 02 · Compaction Trigger

运行：

```bash
npm run compaction:02
```

第一次引入：

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

这一轮只回答：

> **要不要压？**

没有修改 Context，也没有生成 Summary。

所以：

```text
02 = Trigger
```

详细：[`02-compaction-trigger/README.md`](./02-compaction-trigger/README.md)

---

# 03 · Hot / Cold Context

核心问题：

> **已经决定要 Compact 了，到底压哪些内容？**

运行：

```bash
npm run compaction:03
```

这一轮第一次把 Selected Context Units 分成：

```text
Cold Units
= 较旧，但仍然需要
= 后续允许考虑压缩

Hot Units
= 最近正在工作
= 当前原样保留
```

最小 API：

```ts
splitHotCold(units, keepHotUnits)
```

默认场景：

```text
Selected Units = 10
Keep Hot Units = 3
```

得到：

```text
Cold = 7
Hot  = 3
```

当前完整流程：

```text
Context Runtime
↓
Selected Context
↓
estimateContextTokens()
↓
shouldCompact() = true
↓
groupHistoryIntoUnits()
↓
splitHotCold()
↓
├── Cold Units
└── Hot Units
```

注意：这一轮只有 **Partition**。

没有：

```text
删除 Cold
修改 Cold
Summary
LLM Compaction
Context Rebuild
```

Cold 仍然完整存在，只是变成下一轮的压缩候选。

所以：

```text
03 = Partition
```

或者直接记：

```text
02 = 要不要压
03 = 压谁
```

详细：[`03-hot-cold-context/README.md`](./03-hot-cold-context/README.md)

---

## 三轮连起来

```text
01 Problem
= Context 已经 Selection，但仍然太长

02 Trigger
= 判断是否需要进入 Compaction

03 Partition
= 决定哪些 Unit 可以压，哪些保持原样
```

---

## 为什么下一步是 Summarize Cold Context？

现在已经得到：

```text
Cold Units
Hot Units
```

但 Cold 目前仍然是完整原文，一点都没有变短。

所以下一轮进入：

```text
compaction:04 · Summarize Cold Context
```

第一次真正执行：

```text
Cold Units
↓
更短的 Summary
```

而 Hot Units 继续原样保留。

---

## 当前仍然不进入

```text
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

- [ ] 我能解释 `shouldCompact()`。
- [ ] 我知道 Trigger 只回答“该不该压”。

### Compaction 03

- [ ] 我能解释 Hot Context 和 Cold Context。
- [ ] 我知道为什么整个 Context 不应该无差别一起压。
- [ ] 我知道 Cold 不是删除，而是压缩候选。
- [ ] 我知道 Hot Units 当前原样保留。
- [ ] 我能解释 `splitHotCold()`。
- [ ] 我知道这一轮没有真正生成 Summary。
- [ ] 我知道 `02 = Trigger`，`03 = Partition`。
- [ ] 我知道下一步为什么只压缩 Cold Units。

做到这些，就进入 **compaction:04 · Summarize Cold Context**。
