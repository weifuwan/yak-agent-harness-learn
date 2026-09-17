# 05 · Codex · Coding Runtime

状态：`PLANNED`

参考项目：`openai/codex`

> 核心问题：**当 Agent 已经会思考和调用 Tool 后，怎样把它变成一个可被 UI 驱动、可增量改代码、可展示 Diff、可审批并可安全执行的 Coding Runtime？**

## 学习路线

```text
01 Runtime Protocol
   ↓
02 Thread / Turn
   ↓
03 Tool Registry / Router
   ↓
04 Apply Patch
   ↓
05 Turn Diff Tracker
   ↓
06 Approval / Permission
   ↓
07 Sandbox / Runtime
```

对应目录：

```text
05-codex/
├── 01-runtime-protocol/
├── 02-thread-turn/
├── 03-tool-registry-router/
├── 04-apply-patch/
├── 05-turn-diff-tracker/
├── 06-approval-permission/
└── 07-sandbox-runtime/
```

## 源码对照重点

```text
protocol / app-server-protocol → UI ↔ Runtime 协议
thread-store / core session    → Thread / Turn / Resume
core/src/tools/registry.rs     → Tool Registry
core/src/tools/router.rs       → Tool Router
apply-patch/                   → 增量代码修改
core/src/turn_diff_tracker.rs  → Turn 级净 Diff
AskForApproval / permissions   → Approval / Permission
sandboxing / safety / spawn    → 执行隔离
```

主链：

```text
UI
↓ Command
Runtime Protocol
↓
Thread / Turn
↓
Tool Registry / Router
↓
Apply Patch
↓
Turn Diff
↓
Approval
↓
Sandbox Execution
↓ Event
UI
```

对 Yakable 最有价值的部分：

```text
Runtime Protocol
apply_patch
TurnDiffTracker
Tool Registry / Router
Workspace / Sandbox 边界
```

当前不进入完整 Codex 源码学习，等待 Frontend Harness 主线完成后按需取用。
