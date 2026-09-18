# 04 · Component Reference

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`Component Library`

## 核心问题

前面已经有：

```text
name
description
props schema
```

现在系统知道：

```text
组件叫什么
组件是什么意思
组件允许怎么配置
```

但仍然不知道：

> **这个抽象 Button 到底对应项目里的哪个真实 Button？**

这一节只新增：

```text
reference
```

---

## ① Definition 和 Implementation 是两回事

Library Definition：

```text
Button
├── description
├── props schema
└── reference = ui.button
```

Implementation Registry：

```text
ui.button
├── source     = src/components/Button.tsx
└── exportName = Button
```

Runtime 通过 reference 把两边连接起来：

```text
Button
↓
ui.button
↓
src/components/Button.tsx
↓
Button export
```

---

## ② 为什么不直接让 Model 输出源码路径？

如果让 Model 每次决定：

```text
src/components/Button.tsx
src/ui/Button.tsx
@/components/ui/button
...
```

那“组件在哪里”又重新变成了 Model-owned Decision。

所以：

> **Model 只选择抽象组件名，Runtime 负责解析真实实现。**

reference 属于 System-owned Runtime Knowledge。

---

## ③ 这一节不做 Renderer

虽然现在已经能找到：

```text
source
exportName
```

但程序不会：

```text
import React Component
createElement
render
mount DOM
```

这里只证明：

> **Definition 可以稳定解析到真实实现身份。**

真正渲染属于后面的 Renderer 章节。

---

## ④ 实验

还是：

```text
帮我做一个数据同步任务列表页面
```

Model 仍然只输出：

```text
component
purpose
props
```

它**不输出 reference**。

Runtime 自己执行：

```text
component name
↓
Library Definition
↓
reference
↓
Implementation Registry
↓
source + exportName
```

---

## ⑤ 本地 Broken Reference Case

为了验证失败路径，固定加入：

```text
BrokenButton
reference = ui.missing-button
```

Registry 中故意没有：

```text
ui.missing-button
```

预期：

```text
resolved = NO
result   = UNRESOLVED
```

这样能确认：

> reference 不只是说明文字，而是 Runtime 真正可以检查的连接。

同一套检查也会在调用 Model 之前扫描整个 Component Library。这样即使某个坏 reference 这次没有被 Model 选中，也不会悄悄留在 Library 里。

---

## ⑥ 运行

```bash
npm run openui:02:04
```

重点看：

```text
Implementation Registry
Library References
Library Reference Validation
Model Output
Reference Resolution
Runtime Decision
Local Broken Reference Case
```

---

## ⑦ 这一节拿回了什么？

前面：

```text
01 有哪些组件
02 组件是什么意思
03 组件允许怎么配置
```

现在：

```text
04 组件到底对应哪个真实实现
```

于是 Component Definition 已经开始形成：

```text
name
description
props schema
reference
```

但组件越来越多以后，还会出现一个新问题：

> **是不是每次都把所有组件全部塞给 Model？**

下一节进入 Component Groups。

---

## Done

跑完后能回答：

- [ ] Component Reference 解决的是什么问题？
- [ ] 为什么 reference 不应该由 Model 每次生成？
- [ ] Definition 和 Implementation 有什么区别？
- [ ] Runtime 怎么知道一个 reference 是否有效？
- [ ] 为什么能 Resolve reference 仍然不等于已经 Render？

全部能回答后，本节完成。

下一节：

```text
05 · Component Groups
```

下一节只增加一个问题：

> **组件越来越多以后，怎样组织它们，避免所有能力永远平铺给 Model？**
