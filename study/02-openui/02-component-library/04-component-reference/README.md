# 04 · Component Reference

> 核心问题：**抽象组件名怎么稳定连接到项目里的真实组件实现？**

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`Component Library`

## 为什么还需要 Reference？

前面已经有：

```text
name
description
props schema
```

系统已经知道：

```text
Button 是什么
Button 能怎么配置
```

但还不知道：

```text
Button
到底对应哪个真实实现？
```

这一节只新增：

```text
reference
```

## 能力累积

```text
01 name
+
02 description
+
03 props schema
+
04 reference
```

注意：04 **保留 03 的 Props Validation**，不是用 reference 把 props schema 替掉。

## Definition 与 Implementation 分开

Library Definition：

```text
Button
├── description
├── props
└── reference = ui.button
```

Implementation Registry：

```text
ui.button
├── source     = src/components/Button.tsx
└── exportName = Button
```

Runtime：

```text
Button
↓
ui.button
↓
src/components/Button.tsx
↓
Button export
```

## 为什么不让 Model 输出源码路径？

如果让 Model 每次猜：

```text
src/components/Button.tsx
src/ui/Button.tsx
@/components/ui/button
```

“组件在哪里”又回到了 Model-owned Decision。

所以：

```text
Model
→ 选择抽象组件

Runtime
→ 解析真实实现
```

## 固定失败 Case

### Invalid Props

04 会继续验证：

```text
Button
label = 123
variant = rainbow
↓
REJECTED
```

证明 03 的能力没有丢。

### Broken Reference

固定构造：

```text
BrokenButton
reference = ui.missing-button
```

Registry 中不存在：

```text
ui.missing-button
```

结果：

```text
UNRESOLVED
```

Library 在调用 Model 前也会扫描全部 reference。

## 运行

```bash
npm run openui:02:04
```

重点看：

```text
Cumulative Capability
Implementation Registry
Library Reference Validation
Model Output
Props + Reference Validation
Local Invalid Props Case
Local Broken Reference Case
```

## 这一节解决了什么？

现在 Component Definition 已经有：

```text
name
description
props
reference
```

但组件越来越多以后又出现问题：

> **是不是每次都把全部组件暴露给 Model？**

下一节：

```text
05 · Component Groups
```
