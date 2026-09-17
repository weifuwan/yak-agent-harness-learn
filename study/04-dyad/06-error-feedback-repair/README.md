# 06 · Error Feedback / Repair

状态：`PLANNED`

核心问题：**Preview 启不来、构建报错、运行异常时，错误怎样重新进入生成闭环？**

最小 MVP：收集 build / runtime error，把结构化错误反馈给生成层，只修当前问题。

```text
Run / Preview
↓
Error
├── command
├── message
├── file
└── stack
↓
Repair Request
↓
Patch
```

Done：一次可复现错误能被捕获、反馈并通过最小代码修改修复，而不是重新生成整个项目。
