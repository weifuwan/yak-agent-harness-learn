# 04 · Apply Patch

状态：`PLANNED`

核心问题：**为什么成熟 Coding Runtime 更偏向局部 Patch，而不是整文件重写？**

最小 MVP：定义一个 Patch 格式，支持 add / update / delete，并只修改目标区域。

```text
Current File
+
Patch
↓
Validate
↓
Apply
↓
Changed File
```

源码对照重点：Codex `apply-patch/`、`core/src/apply_patch.rs`、tool handler / runtime。

Done：一次小需求只产生最小代码修改，并能在应用前校验 Patch 是否适用于当前文件状态。
