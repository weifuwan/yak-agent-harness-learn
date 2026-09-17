# Yak Agent Harness Learn

> 用成熟开源项目学习 Agent Engineering 与 Frontend Harness：先理解问题，再做最小实现，最后回到源码验证理解。

这个仓库不是为了快速做出一个 Agent Demo，也不是为了机械复刻某个开源项目。

它只做一件事：**围绕 Yakable，把 Agent、Frontend Harness、Visual Editing、App Builder 和 Coding Runtime 拆成可以真正理解、亲手验证的节点，再把需要的能力重新组合起来。**

---

## 学习原则

```text
理解问题
↓
建立边界
↓
做最小实现
↓
验证
↓
再看成熟实现
↓
理解复杂度为什么出现
```

没有先撞到问题，就不提前引入答案。

---

# 第一阶段 · Core MVP · COMPLETE

```text
[x] 01 LLM
[x] 02 Tool
[x] 03 Agent Loop
[x] 04 Session
[x] 05 Context
[x] 06 Compaction
[x] 07 Permission
[x] 08 Recovery
```

核心边界：

```text
LLM        → Provider / Request / Stream
Tool       → Capability / Call / Execution / Result
Agent Loop → Continue / Stop / maxSteps
Session    → 完整历史 / Persistence / Resume
Context    → 本轮模型到底看到什么
Compaction → Selection 后仍太长怎么办
Permission → Tool Call 到 Execution 之间的最终执行权
Recovery   → Retry / State / Checkpoint / Resume / Rollback
```

---

# 第二阶段 · Integration · Mini Coding Agent · COMPLETE

```text
[x] 01 Agent Skeleton
[x] 02 Read → Think → Answer
[x] 03 Read → Edit → Permission → Write
[x] 04 Multi-Step Coding Loop
[x] 05 Session / Context / Recovery
[x] 06 Minimal Coding Agent Runtime
```

记忆方式：

```text
01 = Skeleton
02 = Inspect
03 = Edit
04 = Loop
05 = Continuity
06 = Runtime
```

目录：

```text
integration/
├── 01-agent-skeleton/
├── 02-read-think-answer/
├── 03-read-edit-permission-write/
├── 04-multi-step-coding-loop/
├── 05-session-context-recovery/
├── 06-minimal-coding-agent-runtime/
└── src/
```

详细：[`integration/README.md`](./integration/README.md)

---

## Agent 最终主链

```text
User Prompt
↓
MiniCodingAgentRuntime
↓
Session
↓
Context Runtime
↓
Compaction Runtime
↓
LLM
↓
Tool Batch ?
├── read_file
├── write_file → Permission Runtime
├── run_test
└── no tool → final answer
↓
Tool Results
↓
CodingLoopState
↓
Continue / Done / Recovery Required
```

Recovery：

```text
Resume
= 保留原 CodingLoopState，从停下的位置继续

Rollback
= 使用 Run 开始前的 Checkpoint 恢复工作区
```

Session：

```text
只有完整 Done Run 才 Commit
```

所以它保存的是：

> **完整事实边界，而不是半截执行日志。**

---

# 第三阶段开始 · Source Study for Yakable

Agent 基础已经完成。后续不再为了“学 Agent”而继续堆模块，而是按 Yakable 真正需要的能力，从不同成熟项目中分别学习。

```text
study/
├── 01-opencode/   ✅ Agent Engineering
├── 02-openui/     ← Frontend Harness · 当前
├── 03-onlook/     ⏳ Visual Editing
├── 04-dyad/       ⏳ AI App Builder
└── 05-codex/      ⏳ Coding Runtime
```

详细总路线：[`study/README.md`](./study/README.md)

## 01 · OpenCode · COMPLETE

OpenCode 阶段已经通过本仓库的 `mvp/` + `integration/` 完成 Agent 基础学习。

```text
LLM
Tool
Loop
Session
Context
Compaction
Permission
Recovery
```

源码后续仍可用于对照，但不再是当前主线。

详细：[`study/01-opencode/README.md`](./study/01-opencode/README.md)

---

# 当前阶段 · OpenUI · Frontend Harness

参考项目：`thesysdev/openui`

核心问题：

> **怎样让模型在受控的组件、语言、Runtime 和 Renderer 中生成稳定 UI，而不是每次自由发挥？**

学习路线：

```text
01 No UI Harness
   ↓
02 Component Library
   ↓
03 Library → Prompt
   ↓
04 UI Language / Parser
   ↓
05 Runtime
   ↓
06 Renderer / Design System
   ↓
07 Minimal Frontend Harness
```

对应目录：

```text
study/02-openui/
├── 01-no-ui-harness/
├── 02-component-library/
├── 03-library-to-prompt/
├── 04-ui-language-parser/
├── 05-runtime/
├── 06-renderer-design-system/
└── 07-minimal-frontend-harness/
```

源码重点对应：

```text
OpenUI library.ts            → Component Library
ComponentPromptSpec          → Library → Prompt
parser/                      → UI Language / Parser
runtime/                     → Runtime
Renderer.tsx + Design System → Render
examples/harnesses/          → 完整 Harness
```

详细：[`study/02-openui/README.md`](./study/02-openui/README.md)

---

# 后续阶段

## Onlook · Visual Editing

```text
React Source
↕
DOM
↕
Visual Editor
```

重点研究元素选择、DOM ↔ Source Mapping、视觉修改和代码回写。

详细：[`study/03-onlook/README.md`](./study/03-onlook/README.md)

## Dyad · AI App Builder

```text
Prompt
↓
Project
↓
Workspace
↓
Preview
↓
Incremental Update
```

重点研究前面的能力怎样被组织成完整 AI App Builder 产品闭环。

详细：[`study/04-dyad/README.md`](./study/04-dyad/README.md)

## Codex · Coding Runtime

重点只取 Yakable 真正需要的部分：

```text
Runtime Protocol
Thread / Turn
apply_patch
TurnDiffTracker
Tool Registry
Approval / Sandbox
```

详细：[`study/05-codex/README.md`](./study/05-codex/README.md)

---

# 最终目标 · Yakable

```text
OpenCode
Agent Engineering
        +
OpenUI
Frontend Harness
        +
Onlook
Visual Editing
        +
Dyad
App Builder Workflow
        +
Codex
Patch / Diff / Runtime
        ↓
Yakable
```

但这些项目不是要全部照搬。

最终原则仍然是：

> **把确定性交给 Harness，把不确定性交给 Agent。**

现阶段只推进 **OpenUI · Frontend Harness**，其余目录先作为后续学习边界保留。
