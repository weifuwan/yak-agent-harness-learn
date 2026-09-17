# 01 · OpenCode · Agent Engineering

状态：`COMPLETE`

OpenCode 阶段负责建立 Agent Engineering 的基础认知。

已经完成两层学习：

```text
Core MVP
├── LLM
├── Tool
├── Agent Loop
├── Session
├── Context
├── Compaction
├── Permission
└── Recovery

Integration
├── Skeleton
├── Inspect
├── Edit
├── Loop
├── Continuity
└── Runtime
```

对应本仓库已有目录：

```text
../../mvp/
../../integration/
```

这一阶段形成的核心认识：

```text
LLM 决定意图
Tool 提供能力
Agent Loop 决定如何持续执行
Session 保存完整历史
Context 决定本轮模型看到什么
Compaction 控制上下文长度
Permission 控制副作用
Recovery 处理失败后的继续与回退
```

OpenCode 后续仍然可以用于源码对照，但不再作为当前主学习线。

下一阶段：[`../02-openui/`](../02-openui/)
