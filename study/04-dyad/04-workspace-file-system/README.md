# 04 · Workspace / File System

状态：`PLANNED`

核心问题：**App Builder 怎么把“项目”变成一个稳定、可读写、可恢复的真实工作区？**

最小 MVP：抽象 WorkspaceFileSystem，提供受控的 read / write / list / patch 边界。

```text
Project
↓
Workspace
├── files
├── paths
├── change set
└── persistence
```

目标是把 UI、Agent、Preview 都统一到同一个项目事实源上。

Done：生成、预览和后续修改都读取同一份 workspace 状态，而不是各自维护副本。
