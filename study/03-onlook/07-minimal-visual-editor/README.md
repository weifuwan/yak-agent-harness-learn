# 07 · Minimal Visual Editor

状态：`PLANNED`

核心问题：**把 Selection、Source Mapping、Style Edit、Code Writeback、Preview Sync 组合起来以后，最小 Visual Editor 的边界是什么？**

最终链路：

```text
Preview
↓ click
SelectedElement
↓
DOM → Source Mapping
↓
Style / Token Edit
↓
Code Writeback
↓
Preview Sync
```

这一节不增加新能力，只做最终组合。

Done：用户可以在 Preview 里点中一个元素，修改一个视觉属性，源码产生最小变化，Preview 自动同步。
