# 08 · Recovery MVP

> 核心问题：**模型失败、Tool 失败、进程退出、代码改坏以后怎么办？**

状态：`UNLOCKED`

07 Permission 已完成，现在可以进入 Recovery 学习。

按 [`docs/learning-template.md`](../../docs/learning-template.md) 的 9 步学习。

当前只先保留问题，不提前实现答案：

```text
Agent 已经能运行
↓
也能受 Permission 控制
↓
但模型、Tool、进程、文件修改都可能失败
↓
失败以后怎样知道“发生到哪一步”？
↓
怎样安全地 Retry / Resume / Rollback？
```

下一步先规划 Recovery 学习路线，再做第一个最小问题实验。
