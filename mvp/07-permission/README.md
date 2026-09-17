# 07 · Permission MVP

> 核心问题：**Agent 会调用工具以后，为什么不能让它想做什么就做什么？**

状态：`UNLOCKED`

06 Compaction 已完成，现在可以进入 Permission 学习。

按 [`docs/learning-template.md`](../../docs/learning-template.md) 的 9 步学习。

当前只先保留问题，不提前实现答案：

```text
Agent 已经会调用 Tool
↓
Tool 可能读取文件、修改文件、执行命令
↓
这些能力是否都应该默认允许？
↓
如果不是，谁来决定 allow / ask / deny？
```

Permission 下一步先规划学习路线，再做第一个最小问题实验。
