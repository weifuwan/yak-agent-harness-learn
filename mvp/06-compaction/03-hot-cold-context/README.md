# Compaction 03 · Hot / Cold Context

> 核心问题：**已经决定要 Compact 了，哪些内容应该压，哪些内容应该原样保留？**

运行：

```bash
npm run compaction:03
```

## 上一轮留下的问题

`compaction:02` 已经可以得到：

```text
shouldCompact = true
```

但这只说明：

```text
当前 Model Context 超过 Budget
```

它还没有回答：

```text
到底压哪些内容？
```

如果整个 Context 一起压缩，最近正在执行的任务、刚刚发生的 Tool Result、刚做出的决定也可能被过早压缩。

所以这一轮先做 Partition。

## 最小方案

把已经被 Context Selection 选中的历史 Unit 分成：

```text
Cold Units
= 较旧，但仍然需要
= 后续允许考虑压缩

Hot Units
= 最近正在使用
= 当前保持原样
```

最小 API：

```ts
splitHotCold(units, keepHotUnits)
```

默认：

```text
selected units = 10
keepHotUnits = 3
```

所以：

```text
Cold = 前 7 个
Hot  = 最近 3 个
```

## 为什么不是删除 Cold？

这一轮只是：

```text
Partition
```

不是：

```text
Drop
Summary
Rebuild
```

Cold 仍然是需要保留的信息，只是被标记成“下一步可以压缩的候选”。

## 当前流程

```text
Model Context
↓
estimateContextTokens()
↓
shouldCompact() = true
↓
selected history
↓
groupHistoryIntoUnits()
↓
splitHotCold()
↓
├── Cold Units
└── Hot Units
```

## 这一轮故意不做

```text
Summary
LLM Compaction
Cold 内容改写
Context Rebuild
多级摘要
```

这些留给后续。

## 要记住

```text
compaction:01 = Problem
compaction:02 = Trigger
compaction:03 = Partition
```

更直白一点：

```text
02 = 要不要压
03 = 压谁
```

## Done 标准

- [ ] 我知道为什么整个 Context 不应该无差别一起压。
- [ ] 我能解释 Hot Context 和 Cold Context。
- [ ] 我知道 Cold 不是“删除”，而是“可以压缩的候选”。
- [ ] 我知道 Hot Units 当前原样保留。
- [ ] 我能解释 `splitHotCold()`。
- [ ] 我知道这一轮还没有真正执行 Compaction。
- [ ] 我知道下一步为什么要 Summary Cold Context。
