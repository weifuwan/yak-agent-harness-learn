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
04 Summarize Cold Context     ✅
05 Rebuild Compacted Context  ← 当前
06 Minimal Compaction Runtime ← 后续
```

---

# 01 · No Compaction

```bash
npm run compaction:01
```

故意制造：

```text
Context Selection 已经完成
+
Selected Context 仍然超过 Budget
```

```text
01 = Problem
```

详细：[`01-no-compaction/README.md`](./01-no-compaction/README.md)

---

# 02 · Compaction Trigger

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

```text
02 = Trigger
```

详细：[`02-compaction-trigger/README.md`](./02-compaction-trigger/README.md)

---

# 03 · Hot / Cold Context

```bash
npm run compaction:03
```

把 Selected Context Units 分成：

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

```text
03 = Partition
```

详细：[`03-hot-cold-context/README.md`](./03-hot-cold-context/README.md)

---

# 04 · Summarize Cold Context

```bash
npm run compaction:04
```

第一次真正发生：

```text
Cold Units
↓
LLM Summary
↓
Compacted Cold Summary
```

Hot Units 完全不改。

同时检查：

```text
更短
+
关键事实仍然存在
```

```text
04 = Compress
```

详细：[`04-summarize-cold-context/README.md`](./04-summarize-cold-context/README.md)

---

# 05 · Rebuild Compacted Context

核心问题：

> **Cold 已经压短、Hot 已经保留，怎么重新得到一个真正可以继续调用 LLM 的 ModelContext？**

运行：

```bash
npm run compaction:05
```

这一轮第一次引入：

```ts
rebuildCompactedContext(...)
```

原来：

```text
System / Project
Cold Unit 1
Cold Unit 2
...
Hot Unit 8
Hot Unit 9
Hot Unit 10
Current Task
```

重建后：

```text
System / Project
+
[Compacted Cold History]
+
Hot Unit 8
Hot Unit 9
Hot Unit 10
+
Current Task
```

Cold Summary 放在 system 侧的内部 Context 区域。

Hot Units 保持原始：

```text
user
assistant(tool_call)
tool(result)
assistant
```

默认实验故意让当前任务同时依赖：

```text
Cold:
IMPORTANT-CONSTRAINT-0401

Hot:
RECENT-RESULT-0501
```

所以会验证：

```text
tokens before
tokens after
within budget
cold fact present
hot result present
```

并把 Rebuilt Context 真正发给 LLM，再检查：

```text
cold fact usable
hot result usable
```

这一轮真正验证：

> **Compaction 不只是压短，而是压完之后 Agent 还能继续工作。**

```text
05 = Rebuild
```

详细：[`05-rebuild-compacted-context/README.md`](./05-rebuild-compacted-context/README.md)

---

## 五轮连起来

```text
01 Problem
= 太长了

02 Trigger
= 要不要压

03 Partition
= 压谁

04 Compress
= 怎么把 Cold 压短

05 Rebuild
= 压完以后怎么继续用
```

也就是：

```text
Model Context
↓
Trigger
↓
Hot / Cold
↓
Cold Summary
↓
Rebuild
↓
New Model Context
```

---

## 为什么下一步是 Minimal Compaction Runtime？

现在这些能力还是分散的：

```text
estimateContextTokens()
shouldCompact()
splitHotCold()
summarizeColdUnits()
rebuildCompactedContext()
```

下一轮：

```text
compaction:06 · Minimal Compaction Runtime
```

会把它们收成一个最小入口，例如：

```ts
compactIfNeeded(...)
```

让 Agent Runtime 不再自己编排 Compaction 内部步骤。

---

## 当前仍然不进入

```text
多级 Summary
增量 Summary
Summary 持久化
RAG
Embedding
长期 Memory
复杂 Provider Tokenizer
```

---

## 当前 Done 标准

### Compaction 05

- [ ] 我知道 Summary + Hot Units 还不是最终 ModelContext。
- [ ] 我能解释为什么需要 Rebuild。
- [ ] 我知道 Cold Summary 可以作为内部 Compacted History 重新进入 Context。
- [ ] 我知道 Hot Tool History 应继续保持原始结构。
- [ ] 我知道 Rebuild 后需要重新检查 Token Budget。
- [ ] 我知道“变短”不等于“可继续工作”。
- [ ] 我能验证 Cold 的旧关键事实和 Hot 的最新结果都还能被模型使用。
- [ ] 我知道 `04 = Compress`，`05 = Rebuild`。
- [ ] 我知道下一步为什么要收成 Minimal Compaction Runtime。

做到这些，就进入 **compaction:06 · Minimal Compaction Runtime**。
