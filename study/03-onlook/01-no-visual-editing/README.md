# 01 · No Visual Editing

状态：`PLANNED`

核心问题：**如果 Preview 只能看、不能直接选中和编辑元素，会缺少什么？**

先做一个只读 Preview，记录用户想修改页面时必须回到代码或自然语言描述的问题。

这一节只建立问题，不引入 DOM 映射和代码回写。

```text
React Source
↓
Preview
↓
只能看，不能直接改
```

Done：能解释 Visual Editing 解决的不是“生成 UI”，而是“生成后如何精确选择和修改”。
