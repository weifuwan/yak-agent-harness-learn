# 04 · Style / Token Editing

状态：`PLANNED`

核心问题：**用户在视觉面板里改颜色、间距、圆角时，应该改 DOM style、className，还是 Design Token？**

最小 MVP：支持修改一个受控样式属性，并区分：

```text
Visual Value
↓
Inline / Utility Class / Token
↓
Source Change Intent
```

重点观察字体、颜色、spacing、radius 等视觉值如何映射回可维护代码。

Done：能解释“视觉值变化”和“源码表达方式”不是一回事，并能定义最小的 StyleEdit 模型。
