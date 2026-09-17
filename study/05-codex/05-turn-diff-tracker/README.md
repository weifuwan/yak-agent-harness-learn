# 05 · Turn Diff Tracker

状态：`PLANNED`

核心问题：**没有真实 Git Diff，也能不能稳定展示“这一轮到底改了什么”？**

最小 MVP：记录本轮 Patch 前后的 baseline/current，并持续计算净变化。

```text
Turn Start
↓
Baseline
+
Patch Delta(s)
↓
Current State
↓
Unified Diff
```

源码对照重点：Codex `core/src/turn_diff_tracker.rs`。

Done：连续多个 Patch 后仍能输出当前 Turn 的净 Diff，而不是简单拼接每次 patch 文本。
