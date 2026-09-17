# 02 · Element Selection

状态：`PLANNED`

核心问题：**用户点击 Preview 里的一个元素时，编辑器到底选中了什么？**

最小 MVP：在 iframe / Preview 中点击 DOM Element，得到稳定的 selection 信息并高亮它。

```text
click DOM
↓
SelectedElement
├── tag
├── attributes
├── rect
└── stable id
```

源码对照重点：Onlook Preview 侧的元素选择、overlay、元素身份机制。

Done：点击不同元素时能稳定得到当前 selection，并能解释为什么“DOM 节点引用”本身不够做长期身份。
