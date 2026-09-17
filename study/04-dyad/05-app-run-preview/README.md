# 05 · App Run / Preview

状态：`PLANNED`

核心问题：**代码已经生成以后，怎样真正启动项目并把运行中的页面交给用户看？**

最小 MVP：为 Project 启动 dev server，维护运行状态并提供 Preview URL。

```text
Workspace
↓
App Run
├── install
├── start
├── port
└── process state
↓
Preview
```

源码对照重点：Dyad `src/app_run/`。

Done：项目可以从 workspace 启动，Preview 能访问，并能明确知道当前是 starting / running / failed / stopped。
