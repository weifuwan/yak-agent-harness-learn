# 01 · Project Creation

状态：`PLANNED`

核心问题：**用户第一次输入需求后，一个 App Builder 应该先创建什么，而不是直接让模型随便写文件？**

最小 MVP：定义 Project 元数据、workspace 位置和初始状态。

```text
Prompt
↓
Project
├── id
├── name
├── workspace
└── status
```

源码对照重点：Dyad `src/app/`、`src/app_wiring/` 中项目生命周期与应用状态的组织方式。

Done：能解释 Project 和一次 Chat / Run 的边界。
