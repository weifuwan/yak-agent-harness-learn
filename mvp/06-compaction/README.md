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
03 Hot / Cold Context         ✅
04 Summarize Cold Context     ← 当前
05 Rebuild Compacted Context  ← 后续
06 Minimal Compaction Runtime ← 后续
```

---

# 01 · No Compaction

运行：

```bash
npm run compaction:01
```

故意制造：

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

只回答：

```text
要不要压？
```

所以：

```text
02 = Trigger
```

详细：[`02-compaction-trigger/README.md`](./02-compaction-trigger/README.md)

---

# 03 · Hot / Cold Context

运行：

```bash
npm run compaction:03
```

把已经选中的 Context Units 分成：

```text
Cold Units
= 较旧，但仍然需要
= 后续允许压缩

Hot Units
= 最近正在工作
= 原样保留
```

只回答：

```text
压谁？
```

所以：

```text
03 = Partition
```

详细：[`03-hot-cold-context/README.md`](./03-hot-cold-context/README.md)

---

# 04 · Summarize Cold Context

核心问题：

> **Cold Units 已经确定了，怎么把它们换成更短的表示，同时尽量保住继续执行需要的事实？**

运行：

```bash
npm run compaction:04
```

这一轮第一次真正发生信息压缩：

```text
Cold Units
↓
LLM Summary
↓
Compacted Cold Summary
```

Hot Units 完全保持原样：

```text
Cold → 压缩
Hot  → 不动
```

默认实验会在 Cold 中故意放入：

```text
IMPORTANT-CONSTRAINT-0401
```

然后同时观察：

```text
before tokens
summary tokens
key fact preserved
```

因为：

```text
变短
≠
语义压缩成功
```

如果 Summary 很短，但：

```text
IMPORTANT-CONSTRAINT-0401
```

丢失了，就说明只是长度成功，语义失败。

所以这一轮真正学习的是：

> **Compaction 要同时追求“更短”和“关键状态仍然可用”。**

记成：

```text
04 = Compress
```

详细：[`04-summarize-cold-context/README.md`](./04-summarize-cold-context/README.md)

---

## 四轮连起来

```text
01 Problem
= 太长了

02 Trigger
= 要不要压

03 Partition
= 压谁

04 Compress
= 真正把 Cold 换成更短表示
```

也就是：

```text
01 = Problem
02 = Trigger
03 = Partition
04 = Compress
```

---

## 为什么下一步是 Rebuild Compacted Context？

现在手里已经有：

```text
Compacted Cold Summary
+
Hot Units
```

但还没有真正得到新的：

```text
ModelContext
```

所以当前压缩结果还不能直接代替原来的完整请求结构。

下一轮进入：

```text
compaction:05 · Rebuild Compacted Context
```

第一次正式把：

```text
System
Project Context
Cold Summary
Hot Units
Current Task
```

重新组装成下一次可以直接发给 LLM 的 Context。

---

## 当前仍然不进入

```text
多级摘要
增量摘要树
RAG
Embedding
长期 Memory
复杂 Provider Tokenizer
```

---

## 当前 Done 标准

### Compaction 04

- [ ] 我知道 `04` 是第一次真正压缩内容。
- [ ] 我知道为什么只压 Cold、不动 Hot。
- [ ] 我能解释 `summarizeColdUnits()`。
- [ ] 我知道 Compaction 不等于删除历史。
- [ ] 我知道“变短”不代表“语义成功”。
- [ ] 我知道需要验证重要约束、决定、Tool Result 是否仍然存在。
- [ ] 我知道这一轮还没有重建最终 ModelContext。
- [ ] 我知道下一步为什么是 Rebuild Compacted Context。

做到这些，就进入 **compaction:05 · Rebuild Compacted Context**。
