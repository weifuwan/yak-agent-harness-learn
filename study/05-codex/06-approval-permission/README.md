# 06 · Approval / Permission

状态：`PLANNED`

核心问题：**Tool 想执行、策略允许执行、用户是否需要确认，这三件事怎么分开？**

最小 MVP：把 Tool Intent、Permission Policy、Approval Requirement 拆成独立判断。

```text
Tool Call
↓
Permission Policy
↓
Approval Required ?
├── No  → Execute
└── Yes → User Decision → Execute / Reject
```

源码对照重点：Codex `AskForApproval`、permission profile、tool sandboxing / approval requirement。

Done：能解释 Permission 与 Approval 的区别，并让用户确认不会污染 Tool 本身的能力定义。
