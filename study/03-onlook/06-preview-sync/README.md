# 06 · Preview Sync

状态：`PLANNED`

核心问题：**源码已经回写以后，Preview、Selection 和编辑器状态怎么保持一致？**

最小 MVP：代码变化后触发 Preview 更新，并让旧 selection 能恢复或明确失效。

```text
Code Writeback
↓
Preview Refresh / HMR
↓
DOM Recreated
↓
Selection Reconcile
```

重点关注 iframe / RPC / Preview 通信以及元素身份在重新渲染后的恢复。

Done：修改源码后 Preview 自动更新，编辑器不会继续持有失效 DOM 引用。
