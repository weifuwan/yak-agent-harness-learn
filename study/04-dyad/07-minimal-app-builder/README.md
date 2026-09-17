# 07 · Minimal App Builder

状态：`PLANNED`

核心问题：**把 Project、Template、Generation、Workspace、Preview、Repair 组合起来以后，最小 AI App Builder 的产品闭环是什么？**

最终链路：

```text
Prompt
↓
Create Project
↓
Bootstrap Template
↓
Generate Changes
↓
Workspace
↓
Run / Preview
↓
Error Feedback / User Feedback
↓
Incremental Update
```

这一节不增加新能力，只做组合。

Done：用户可以创建项目、看到 Preview、继续提修改，并且后续修改发生在同一个 Project / Workspace 中。
