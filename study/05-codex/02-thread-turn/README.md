# 02 · Thread / Turn

状态：`PLANNED`

核心问题：**长期任务为什么需要 Thread，而不是只保存一串 Chat Message？**

最小 MVP：定义 `Thread` 与 `Turn`，支持连续执行和 resume。

```text
Thread
├── Turn 1
├── Turn 2
└── Turn 3
```

源码对照重点：Codex thread store、resumeThread、Turn 生命周期。

Done：能解释 Project / Thread / Turn 三者分别解决什么问题，并能恢复一个已有 Thread 继续执行。
