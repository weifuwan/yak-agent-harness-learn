# 03 · DOM → Source Mapping

状态：`PLANNED`

核心问题：**浏览器里选中的 DOM Element，怎么找到真正生成它的 React 源码？**

最小 MVP：给可渲染节点注入/维护源码身份，再从 DOM selection 反查：

```text
DOM Element
↓
SourceRef
├── file
├── component
├── line / node id
└── element id
```

源码对照重点：`packages/parser/src/ids.ts`、`template-node/` 以及 Preview 与源码之间的 identity 机制。

Done：能解释 DOM Tree 和 Source AST 为什么不是一一对应，以及为什么需要稳定的映射层。
