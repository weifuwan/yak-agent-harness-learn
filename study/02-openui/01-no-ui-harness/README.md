# 01 · No UI Harness

状态：`IMPLEMENTED · WAITING FOR RUN`

核心问题：

> 如果只给模型一句前端需求，不提供任何 Frontend Harness，会发生什么？

这一节故意**不解决问题**，只观察问题。

---

## ① 它处在整个流程什么位置？

现在的最原始流程只有：

```text
User Prompt
↓
LLM
↓
Frontend Decisions
↓
Code
```

这里没有：

```text
Component Library
UI Language
Design System
Runtime
Renderer
Page Pattern
Frontend Spec
```

所以：

```text
技术栈
组件
字体
颜色
圆角
布局
页面结构
目录结构
依赖
```

全部交给模型临时决定。

---

## ② No UI Harness 到底是什么意思？

不是“什么 Prompt 都没有”。

这一节仍然会固定输出 JSON，方便比较。

但我们**不固定任何前端答案**：

```text
不指定 React / Vue
不指定版本
不指定 Tailwind / CSS Modules
不指定 shadcn / Ant Design
不指定字体
不指定颜色
不指定圆角
不指定 Sidebar / TopNav
不指定目录结构
不指定允许使用的组件
```

也就是说：

> 输出格式由程序约束，但前端决策仍然由模型拥有。

注意：即使 Prompt 已经要求某个 JSON 结构，模型仍可能把 `string[]` 返回成 `object[]`，甚至返回别的形态。

因此本实验不会因为字段形态漂移直接失败，而会把它记录成 `schema drift`：

```text
Prompt 表达了期望
≠
Runtime 已经拥有可靠约束
```

这种结构漂移本身也是 No Harness 的实验结果。

---

## ③ 最小实验

同一个 Prompt 连续请求多次：

```text
帮我做一个“数据同步系统”的前端。
```

为了让差异可比较，要求模型返回一张前端决策表：

```text
framework / version
uiLibrary
styling
stateManagement
router
font
primaryColor
cardRadius
navigation
pageLayout
pages
coreComponents
directoryStructure
dependencies
```

代码：

```text
index.ts
```

运行：

```bash
npm run openui:01
```

默认运行 3 次。

也可以：

```bash
HARNESS_RUNS=5 npm run openui:01
```

`HARNESS_RUNS` 支持 `2 ~ 10`。

---

## ④ 看什么结果？

程序最后会输出类似：

```text
┌────────────────────┬────────┬─────────────────┐
│ dimension          │ unique │ result          │
├────────────────────┼────────┼─────────────────┤
│ framework          │ 2/3    │ VARIES          │
│ uiLibrary          │ 3/3    │ VARIES          │
│ font               │ 2/3    │ VARIES          │
│ cardRadius         │ 3/3    │ VARIES          │
│ ...                │ ...    │ ...             │
└────────────────────┴────────┴─────────────────┘
```

同时会输出：

```text
schema drift runs : x/y
```

如果某一轮没有按预期 JSON 字段形态返回，这不会再让实验直接中断，而会被当成需要观察的数据。

这里不要把：

```text
STABLE_THIS_RUN
```

误解成：

```text
已经被 Harness 固定
```

同一个模型这几次恰好选择一致，只能说明它当前默认偏好比较稳定。

真正的问题是：

> **这个值的 owner 仍然是 Model，而不是 Product / Harness。**

例如模型连续三次都选择 `12px` 圆角，也不代表 Yakable 已经规定：

```text
card radius = 12px
```

换模型、换上下文、换 Prompt、换一次生成，都可能漂移。

---

## ⑤ 回头看 OpenUI

OpenUI 并没有让模型自由生成任意 React。

源码里已经出现明确的约束层：

```text
packages/lang-core/src/library.ts
```

组件通过类似：

```text
defineComponent({
  name,
  props,
  description,
  component,
})
```

进入 Library。

然后：

```text
packages/lang-core/src/parser/prompt.ts
```

又把这些能力转换成：

```text
ComponentPromptSpec
PromptSpec
```

模型看到的是“允许使用什么”，而不是从无限 React 世界里自己猜。

OpenUI 甚至明确约束：

```text
只输出 openui-lang
只能使用已声明能力
不要发明不存在的函数
```

这就是下一阶段真正开始出现的：

```text
Harness
```

---

## ⑥ 这一节的边界

这节不解决：

```text
怎样限制组件
怎样限制样式
怎样定义 Design System
怎样设计 UI Language
怎样 Render
```

只确认一个事实：

```text
Prompt
≠
Frontend Harness
```

Prompt 告诉模型“我要什么”。

Harness 开始决定：

```text
你允许怎么做
```

---

## Done

运行实验后，能自己解释下面五句话：

- [ ] 为什么同一句前端 Prompt 可以产生不同技术栈 / 风格 / 布局？
- [ ] 为什么某个字段连续几次相同，也不能说明它已经稳定？
- [ ] 我能区分“输出格式约束”和“Frontend Harness 约束”。
- [ ] 我能解释为什么 JSON 字段形态漂移本身也是 No Harness 的结果。
- [ ] 我能解释：没有 Harness 时，前端关键决策的 owner 是 Model。

全部能解释后，本节完成。

下一节：

```text
02 · Component Library
```

我们只拿回第一小块确定性：

> **明确告诉模型：你到底可以使用哪些 UI 组件。**
