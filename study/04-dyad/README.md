# 04 · Dyad · AI App Builder

状态：`PLANNED`

参考项目：`dyad-sh/dyad`

> 核心问题：**Frontend Harness、代码生成、Workspace 和 Preview 已经存在以后，怎样把它们组织成一个真正可持续迭代的 AI App Builder？**

## 学习路线

```text
01 Project Creation
   ↓
02 Template Bootstrap
   ↓
03 AI Code Generation
   ↓
04 Workspace / File System
   ↓
05 App Run / Preview
   ↓
06 Error Feedback / Repair
   ↓
07 Minimal App Builder
```

对应目录：

```text
04-dyad/
├── 01-project-creation/
├── 02-template-bootstrap/
├── 03-ai-code-generation/
├── 04-workspace-file-system/
├── 05-app-run-preview/
├── 06-error-feedback-repair/
└── 07-minimal-app-builder/
```

## 源码对照重点

```text
src/app/         → Project / App 生命周期
src/app_wiring/  → 能力装配
src/chat_stream/ → AI 生成流
src/app_run/     → 本地运行与进程状态
src/backup_manager.ts → 项目恢复 / 保护
```

主链：

```text
Prompt
↓
Project
↓
Template
↓
Generate Changes
↓
Workspace
↓
Run / Preview
↓
Error / User Feedback
↓
Incremental Update
```

与 Yakable 的关系：

> OpenUI 偏 Frontend Harness，Onlook 偏 Visual Editing，Dyad 用来学习这些能力怎样被组织成一个真正可用的 AI App Builder 产品闭环。

当前不进入实现，等待前面的 Harness / Visual Editing 阶段完成。
