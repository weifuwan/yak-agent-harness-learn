# 06 · Compaction MVP

> 核心问题：**Context 越来越长以后怎么办？**

状态：`UNLOCKED`

05 Context 已完成，现在可以进入 Compaction 学习。

按 [`docs/learning-template.md`](../../docs/learning-template.md) 的 9 步学习。

当前只先保留问题，不提前实现方案：

```text
Session 已经完整保存
↓
Context Runtime 也已经会选择必要信息
↓
但“必须保留”的 Context 本身还是很长
↓
怎么办？
```

Compaction 要解决的不是：

```text
哪些历史应该进入 Context？
```

这个已经属于 Context Selection。

Compaction 真正要研究的是：

> **这些应该保留的信息已经太长时，怎么压缩，同时尽量保留继续完成任务需要的状态？**

下一步先规划学习路线，再做第一个最小问题实验。
