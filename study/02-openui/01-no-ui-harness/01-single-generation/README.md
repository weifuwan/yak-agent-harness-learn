# 01 · Single Generation

> 核心问题：**先不加任何 UI 约束，模型一次生成会做出哪些自主决定？**

状态：`COMPLETE`

所属章节：`No UI Harness`

> 用户只给一句业务需求时，模型实际上会替产品补出多少前端决定？

这一节只生成 **1 次**。

不比较，不统计，不修复。

---

## ① 最原始链路

```text
User Prompt
↓
LLM
↓
Model Output
```

没有：

```text
Component Library
Design System
UI Language
Runtime
Renderer
Page Pattern
Frontend Spec
```

---

## ② Prompt

这一节故意只发一句：

```text
帮我做一个数据同步系统的前端
```

不额外指定：

```text
React / Vue
版本
UI Library
CSS
字体
颜色
圆角
Sidebar / TopNav
页面结构
组件
目录
依赖
```

甚至不要求模型输出 JSON。

因为这里还不研究“输出结构是否稳定”。

只看：

> 模型为了完成任务，会主动补哪些假设？

---

## ③ 运行

```bash
npm run openui:01:01
```

程序会原样打印模型回答。

然后观察：

```text
framework / version
UI library / styling
router / state management
font / color / radius
navigation / page layout
pages / components
directory / dependencies
```

这些东西哪些是用户明确说的？

哪些是模型自己决定的？

---

## ④ 这节不要做什么

不要评价：

```text
React 选得好不好
Tailwind 对不对
页面设计漂不漂亮
```

这里还没有比较样本。

只确认：

```text
用户输入的信息
<
模型最终输出需要的信息
```

中间缺失的部分，会被模型自己补齐。

---

## ⑤ 与 OpenUI 的关系

OpenUI 后面会逐步把这些“模型自由决定”的空间收回来。

例如：

```text
Component Library
→ 允许使用什么组件

PromptSpec
→ 模型看到什么能力和规则

UI Language
→ 模型允许输出什么结构

Runtime / Renderer
→ 输出最终怎么执行和渲染
```

但这一节暂时不引入这些答案。

---

## Done

跑完后能回答：

- [x] 用户实际只提供了什么？
- [x] 模型为了完成需求，又主动补出了什么？
- [x] 我能区分“业务需求”和“模型假设”。
- [x] 我能解释：No Harness 时，大量前端决定默认属于 Model。

全部能回答后，本节完成。

下一节：

```text
02 · Repeat Same Prompt
```

那时只增加一个变量：

> **同一句话，再生成一次，会不会还是同样的决定？**
