# 07 · Sandbox / Runtime

状态：`PLANNED`

核心问题：**即使用户允许执行，为什么还必须有真正的运行环境隔离？**

最小 MVP：把可写目录、只读目录、网络访问和进程执行限制放到 Runtime/Sandbox，而不是只靠逻辑判断。

```text
Approved Tool
↓
Sandbox Policy
├── filesystem
├── network
└── process
↓
Runtime Execution
```

源码对照重点：Codex sandboxing、safety、spawn、workspace permission policy。

Done：能解释 Approval 是“可不可以执行”，Sandbox 是“即使执行也只能做什么”，并完成最小受限 workspace 执行。
