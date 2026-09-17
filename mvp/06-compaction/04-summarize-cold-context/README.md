# Compaction 04 · Summarize Cold Context

> 核心问题：**Cold Units 已经确定了，怎么把它们变成更短的表示，同时尽量保住后续仍需要的事实？**

运行：

```bash
npm run compaction:04
```

---

## 这一轮第一次真正发生 Compaction

前面三轮只是：

```text
01 Problem
= Context 太长

02 Trigger
= 要不要压

03 Partition
= 压谁
```

这一轮才第一次：

```text
Cold Units
↓
LLM Summary
↓
Compacted Cold Summary
```

所以：

```text
04 = Compress
```

---

## Hot 不动

仍然沿用上一轮的边界：

```text
Cold Units
= 较旧但仍重要
= 允许压缩

Hot Units
= 最近正在工作
= 原样保留
```

`compaction:04` 只把 `coldUnits` 交给 `summarizeColdUnits()`。

Hot Units 不进入 Summary，也不会被改写。

---

## 最小 Summarizer

这一轮新增：

```ts
summarizeColdUnits({
  coldUnits,
  apiKey,
  baseUrl,
  model,
})
```

Summary Prompt 要求尽量保留：

```text
用户约束
已经做出的决定
重要 Tool Result
未完成事项
后续继续任务需要的事实
明确标识符 / code
```

而压掉：

```text
重复表达
过程性废话
无关解释
重复背景
```

---

## 为什么要埋一个关键事实？

默认 Cold Context 中故意加入：

```text
IMPORTANT-CONSTRAINT-0401
```

它代表一个后续任务仍然依赖的硬约束。

Summary 后不仅看：

```text
before tokens
summary tokens
```

还检查：

```text
summary.includes("IMPORTANT-CONSTRAINT-0401")
```

因为：

```text
变短
≠
压缩成功
```

如果 Summary 很短，但关键约束丢了：

```text
key fact preserved = false
```

那只是长度成功，语义失败。

---

## Selection 和 Compaction 再区分一次

```text
Selection
= 某些信息不再进入 Context
```

```text
Compaction
= 信息仍然保留，但换成更短的表示
```

所以 Cold 的原始多条消息会变成一个较短 Summary。

这不是简单删除。

---

## 这一轮仍然没有做什么？

还没有：

```text
Cold Summary
+
Hot Units
↓
新的 ModelContext
```

也就是说，这一轮只产出：

```text
Compacted Cold Summary
```

没有重建最终请求。

这个问题留给：

```text
compaction:05 · Rebuild Compacted Context
```

---

## Done 标准

- [ ] 我知道 `04` 是第一次真正改变 Context 的信息表示。
- [ ] 我能解释为什么只 Summary Cold，不动 Hot。
- [ ] 我知道 Compaction 不等于删除。
- [ ] 我知道“压得更短”不代表“语义压缩成功”。
- [ ] 我知道要验证关键事实是否被保留。
- [ ] 我能解释 `summarizeColdUnits()` 的职责。
- [ ] 我知道这一轮还没有重建最终 ModelContext。
- [ ] 我知道下一步为什么是 Rebuild Compacted Context。
