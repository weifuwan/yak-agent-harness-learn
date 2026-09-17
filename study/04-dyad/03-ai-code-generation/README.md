# 03 · AI Code Generation

状态：`PLANNED`

核心问题：**有了 Project 和 Template 后，模型应该生成什么粒度的代码？**

最小 MVP：让模型只在既有工程和 Frontend Harness 约束下新增/修改页面代码，而不是重建项目。

```text
Prompt
+
Project Context
+
Template / Harness
↓
Code Change Plan
↓
Generated Changes
```

源码对照重点：Dyad `src/chat_stream/` 与生成结果如何进入应用工作流。

Done：生成输入明确包含当前项目上下文，产物是对现有项目的变更而不是全量自由生成。
