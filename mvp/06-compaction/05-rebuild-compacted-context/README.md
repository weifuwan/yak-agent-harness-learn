# Compaction 05 · Rebuild Compacted Context

> 核心问题：**Cold 已经压成 Summary、Hot 也保留好了，怎么重新得到一个真正可以继续调用 LLM 的 ModelContext？**

运行：

```bash
npm run compaction:05
```

---

## 从上一轮开始

`compaction:04` 结束时只有：

```text
Cold Summary
+
Hot Units
```

它们还只是两个中间产物，不是完整 ModelContext。

真正调用模型仍然需要：

```text
System / Project Context
+
Compacted Cold History
+
Hot Units
+
Current Task
```

所以这一轮第一次引入：

```ts
rebuildCompactedContext(...)
```

---

## Rebuild 结构

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

压缩并重建后：

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

Cold Summary 放在 system 侧的内部 Context 区域，不伪造成新的用户消息。

Hot Units 则完整保留原始：

```text
user
assistant(tool_call)
tool(result)
assistant
```

---

## 默认验证

Cold 中故意放：

```text
IMPORTANT-CONSTRAINT-0401
```

Hot Tool Result 中故意放：

```text
RECENT-RESULT-0501
```

当前任务要求同时回答这两个值。

所以运行时会检查：

```text
tokens before
tokens after
within budget
cold fact present
hot result present
```

最后还会真正调用一次 LLM，检查：

```text
cold fact usable
hot result usable
```

---

## 这一轮真正验证什么？

Compaction 不能只看：

```text
Before 4000
After 1500
```

还必须看：

```text
压缩后的 Context
还能不能继续完成任务？
```

所以成功条件至少包含：

```text
更短
+
结构仍然合法
+
旧关键事实还能用
+
最近 Hot 状态还能用
```

---

## 04 和 05 的区别

```text
04 = Compress
Cold 原文怎么变成更短 Summary
```

```text
05 = Rebuild
Summary + Hot 怎么重新变成可运行 Context
```

---

## 这一轮仍然不做

```text
统一 Compaction Runtime
自动 compactIfNeeded()
多轮重复压缩
Summary 持久化
多级 Summary
Provider 精确 Tokenizer
```

这些留到下一轮。

下一步：

```text
compaction:06 · Minimal Compaction Runtime
```

把：

```text
Trigger
Partition
Summary
Rebuild
```

统一收进一个入口。
