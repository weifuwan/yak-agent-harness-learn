# 06 · Compaction 学习

> 核心问题：**Context 已经知道该保留什么，但这些必须保留的信息本身还是太长，怎么办？**

状态：`COMPLETE`

核心边界：

```text
Context
= 决定这一轮放哪些信息

Compaction
= 这些应该保留的信息太长时，换成更短但仍可继续工作的表示
```

所以：

> **Selection 解决“选哪些”，Compaction 解决“选出来以后还是太长”。**

---

## 学习路线

```text
01 No Compaction              ✅
02 Compaction Trigger         ✅
03 Hot / Cold Context         ✅
04 Summarize Cold Context     ✅
05 Rebuild Compacted Context  ✅
06 Minimal Compaction Runtime ✅
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

这一轮只暴露问题：

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

流程：

```text
ModelContext
↓
estimateContextTokens()
↓
shouldCompact()
↓
├── false → CONTINUE
└── true  → COMPACT
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

```text
03 = Partition
```

详细：[`03-hot-cold-context/README.md`](./03-hot-cold-context/README.md)

---

# 04 · Summarize Cold Context

```bash
npm run compaction:04
```

第一次真正发生信息压缩：

```text
Cold Units
↓
LLM Summary
↓
Compacted Cold Summary
```

Hot Units 完全不改。

同时验证：

```text
更短
+
关键事实仍然存在
```

所以：

```text
04 = Compress
```

详细：[`04-summarize-cold-context/README.md`](./04-summarize-cold-context/README.md)

---

# 05 · Rebuild Compacted Context

```bash
npm run compaction:05
```

Cold Summary + Hot Units 还不是最终模型输入，所以这一轮第一次引入：

```ts
rebuildCompactedContext(...)
```

重建结构：

```text
System / Project
+
[Compacted Cold History]
+
Hot Units
+
Current Task
```

Cold 从完整事件历史变成更短 Summary。

Hot Tool History 继续保持原始：

```text
user
assistant(tool_call)
tool(result)
assistant
```

重建以后重新检查：

```text
tokens before
tokens after
within budget
```

并真正调用 LLM，验证：

```text
Cold 旧事实仍可用
+
Hot 最新结果仍可用
```

所以：

```text
05 = Rebuild
```

详细：[`05-rebuild-compacted-context/README.md`](./05-rebuild-compacted-context/README.md)

---

# 06 · Minimal Compaction Runtime

```bash
npm run compaction:06
```

前五轮以后，调用方已经能手工编排：

```text
estimate
→ trigger
→ partition
→ summary
→ rebuild
```

这一轮不再增加算法，而是把这些步骤收成统一入口：

```ts
const result = await compactIfNeeded({
  context,
  tokenBudget,
  keepHotUnits,
  apiKey,
  baseUrl,
  model,
})
```

内部：

```text
ModelContext
↓
estimate
↓
Trigger
↓
├── within budget
│   └── 原样返回
│
└── over budget
    ↓
    Partition
    ↓
    Cold Summary
    ↓
    Rebuild
    ↓
    Rebuilt Context
```

调用方最终只需要：

```ts
result.context.messages
```

继续调用模型。

默认实验同时验证两条分支：

```text
Case A
小 Context
→ compacted = false
→ no-op

Case B
大 Context
→ compacted = true
→ Trigger → Partition → Summary → Rebuild
```

所以：

```text
06 = Runtime
```

详细：[`06-minimal-compaction-runtime/README.md`](./06-minimal-compaction-runtime/README.md)

---

## 六轮最终关系

```text
01 Problem
= 太长了

02 Trigger
= 要不要压

03 Partition
= 压谁

04 Compress
= Cold 怎么压短

05 Rebuild
= 压完怎么继续用

06 Runtime
= 把整个过程封装成一个能力
```

完整流程：

```text
ModelContext
↓
Compaction Runtime
↓
检查 Budget
↓
如果不需要压缩
→ 原样返回
↓
如果需要压缩
→ Hot / Cold
→ Cold Summary
→ Rebuild
↓
可继续使用的 Model Context
↓
LLM
```

---

## 和 Context 的最终边界

```text
Session
= 完整事实历史

Context Runtime
= 这一轮应该给模型看什么

Compaction Runtime
= 这些应该看的信息太长时，怎么变短
```

所以：

> **Context 负责选择，Compaction 负责重新表示。**

---

## 当前 MVP 的明确限制

当前 Compaction Runtime 故意只做一次压缩 pass。

如果：

```text
压缩以后仍然 > Budget
```

只通过：

```text
withinBudgetAfter = false
```

暴露结果。

暂时不进入：

```text
递归 Compaction
多级 Summary
增量 Summary
Summary 持久化
RAG
Embedding
长期 Memory
复杂 Provider Tokenizer
```

这些复杂度等后续真正遇到问题再引入。

---

## Done 标准

- [ ] 我能区分 Context Selection 和 Compaction。
- [ ] 我知道 Context 已经 Selection 后仍可能超过 Budget。
- [ ] 我能解释 `shouldCompact()`。
- [ ] 我能解释为什么要区分 Hot / Cold。
- [ ] 我知道 Compaction 不是简单删除，而是更短地表示旧状态。
- [ ] 我知道“压得更短”不等于“语义压缩成功”。
- [ ] 我能解释为什么 Summary 后还需要 Rebuild。
- [ ] 我知道 Hot Tool History 为什么应该保持原始结构。
- [ ] 我能解释 `compactIfNeeded()` 为什么存在。
- [ ] 我知道没超 Budget 时 Runtime 应该 no-op。
- [ ] 我知道 Agent Runtime 不需要自己编排 Compaction 内部步骤。
- [ ] 我能解释当前一次压缩 pass 的明确限制。

做到这些，**06 · Compaction MVP 完成**。
