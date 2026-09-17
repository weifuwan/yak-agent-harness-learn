# Compaction 06 · Minimal Compaction Runtime

> 核心问题：**Trigger、Partition、Summary、Rebuild 都已经会了，Agent Runtime 还需要自己编排这些步骤吗？**

答案：不需要。

这一轮不增加新的压缩算法，只把前五轮收成一个最小运行时入口。

---

## 运行

```bash
npm run compaction:06
```

---

## 之前的问题

到 `compaction:05`，调用方已经可以手动写：

```text
estimate
↓
shouldCompact
↓
splitHotCold
↓
summarizeColdUnits
↓
rebuildCompactedContext
```

但如果这些步骤都泄漏给 Agent Runtime：

```text
Agent Runtime
├── 知道 Token 怎么估算
├── 知道什么时候压
├── 知道 Cold / Hot 怎么拆
├── 知道 Summary 怎么生成
└── 知道 Context 怎么重建
```

职责已经开始混在一起。

---

## 这一轮的最小边界

新增统一入口：

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

调用方只拿：

```ts
result.context.messages
```

继续调用模型。

内部流程：

```text
ModelContext
↓
estimateContextTokens()
↓
shouldCompact()
↓
├── false
│   ↓
│   原 Context 原样返回
│
└── true
    ↓
    groupHistoryIntoUnits()
    ↓
    splitHotCold()
    ↓
    summarizeColdUnits()
    ↓
    rebuildCompactedContext()
    ↓
    Rebuilt Context
```

---

## 两种结果

### 1. within_budget

```text
compacted = false
reason = within_budget
```

表示当前 Context 已经在 Budget 内。

Runtime 不调用 Summary LLM，也不修改 Context。

### 2. over_budget

```text
compacted = true
reason = over_budget
```

Runtime 自动执行一次最小 Compaction pass：

```text
Trigger
→ Partition
→ Summary
→ Rebuild
```

并返回：

```text
beforeTokens
afterTokens
coldUnits
hotUnits
withinBudgetAfter
```

---

## 默认实验

### Case A · Small Context

```text
Context 小于 Budget
↓
compactIfNeeded()
↓
不压缩
↓
原样返回
```

### Case B · Large Context

```text
Context 超过 Budget
↓
compactIfNeeded()
↓
Cold / Hot
↓
Cold Summary
↓
Rebuild
↓
新的模型输入
```

大 Context 中故意同时保留：

```text
Cold:
IMPORTANT-CONSTRAINT-0401

Hot:
RECENT-RESULT-0601
```

Runtime 完成后会真正把：

```ts
result.context.messages
```

发给模型，验证旧约束和最近结果是否仍然可用。

---

## 当前 Runtime 故意很简单

它只做一次 Compaction pass。

如果：

```text
压完以后
仍然 > Budget
```

当前只通过：

```text
withinBudgetAfter = false
```

暴露这个结果。

暂时不继续实现：

```text
第二轮 Compaction
多级 Summary
递归压缩
Summary 持久化
增量 Summary
Provider 精确 Tokenizer
```

因为这些属于下一层工程复杂度。

---

## 六轮最终关系

```text
01 Problem
= Context 太长

02 Trigger
= 要不要压

03 Partition
= 压谁

04 Compress
= Cold 怎么变短

05 Rebuild
= 压完怎么继续使用

06 Runtime
= 把整个过程封装成一个能力
```

可以记成：

> **Compaction Runtime = 如果 Context 太长，负责把它转换成更短但仍可继续工作的模型输入。**

---

## Done 标准

- [ ] 我能解释 `compactIfNeeded()` 为什么存在。
- [ ] 我知道没超 Budget 时 Runtime 应该 no-op。
- [ ] 我知道超 Budget 时才进入真正 Compaction。
- [ ] 我知道 Agent Runtime 不应该自己编排 Trigger / Partition / Summary / Rebuild。
- [ ] 我知道最终调用方只需要消费 `result.context.messages`。
- [ ] 我知道一次 Compaction 后仍可能超 Budget，这个 MVP 暂时不做递归压缩。
- [ ] 我能解释 `01 Problem → 02 Trigger → 03 Partition → 04 Compress → 05 Rebuild → 06 Runtime`。

做到这些，Compaction MVP 可以封板。
