# Compaction 02 · Compaction Trigger

> 核心问题：**什么时候才应该进入 Compaction？**

运行：

```bash
npm run compaction:02
```

---

## 01 留下的问题

`compaction:01` 只是打印：

```text
estimated tokens > token budget
```

然后由人看到：

```text
Context 超预算了
```

但 Agent Runtime 不能依赖人看日志。

它需要一个正式判断：

```text
当前 Context
↓
是否需要进入 Compaction？
```

---

## 最小 Trigger

这一轮第一次引入：

```ts
shouldCompact(estimatedTokens, tokenBudget)
```

最小规则：

```text
estimatedTokens <= tokenBudget
→ CONTINUE

estimatedTokens > tokenBudget
→ COMPACT
```

也就是：

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

---

## 两个对照场景

### Case A · Within Budget

构造较小的 Context：

```text
Context Selection
↓
最近 2 个 Unit
↓
estimated tokens < 2000
↓
shouldCompact = false
↓
CONTINUE
```

### Case B · Over Budget

构造较大的 Context：

```text
Context Selection
↓
最近 12 个 Unit
↓
estimated tokens > 2000
↓
shouldCompact = true
↓
COMPACT
```

当前 `TOKEN_BUDGET = 2000` 只是学习场景中的工程预算，不代表模型真实 Context Window。

Token 仍然使用学习版近似估算：

```text
characters / 4
```

这一轮研究的是 Trigger，而不是 tokenizer 精度。

---

## 这一轮没有做什么？

即使结果是：

```text
COMPACT
```

代码也不会真正压缩 Context。

这一轮没有：

```text
Hot / Cold
Summary
Context Rebuild
Compaction Runtime
```

因为 `02` 只回答：

> **该不该压？**

不回答：

> **怎么压？**

---

## 关键认知

```text
01 = Problem
02 = Trigger
```

`01`：发现 Context 超预算。

`02`：把“超预算”变成正式的 Runtime 决策。

下一轮 `compaction:03` 才继续研究：

> **既然应该压缩，哪些 Context 可以压，哪些应该保持原样？**
