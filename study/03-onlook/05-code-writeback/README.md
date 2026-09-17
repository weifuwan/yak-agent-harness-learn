# 05 · Code Writeback

状态：`PLANNED`

核心问题：**视觉修改最终怎样安全、最小地写回 React 源码？**

最小 MVP：从一个 `SourceRef + StyleEdit` 生成 AST / code edit，只修改目标节点。

```text
SelectedElement
+
StyleEdit
↓
SourceRef
↓
Code Edit
↓
Formatted Source
```

源码对照重点：Onlook `packages/parser/src/code-edit/` 与格式化链路。

Done：一次视觉修改只改目标源码片段，不重写整个文件，也能解释为什么直接字符串替换不可靠。
