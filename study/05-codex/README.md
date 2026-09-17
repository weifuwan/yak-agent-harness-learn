# 05 · Codex · Coding Runtime

状态：`PLANNED`

参考项目：`openai/codex`

这个阶段暂时不实现，只保留学习目标。

## 重点问题

```text
UI / Client
↓
Runtime Protocol
↓
Thread / Turn
↓
Tool Registry
↓
Patch / Diff
↓
Approval / Sandbox
↓
Workspace
```

重点研究：

```text
Protocol：UI ↔ Runtime 事件协议
Thread / Turn：任务连续性
apply_patch：增量代码修改
TurnDiffTracker：无 Git 也能持续展示 Diff
Tool Registry / Router：工具执行边界
Approval：执行前确认
Sandbox：真正的运行环境隔离
```

对 Yakable 最有价值的部分：

```text
apply_patch
TurnDiffTracker
Runtime Protocol
Workspace / Sandbox 边界
```

当前不进入完整 Codex 源码学习，等待 Frontend Harness 主线完成后按需取用。
