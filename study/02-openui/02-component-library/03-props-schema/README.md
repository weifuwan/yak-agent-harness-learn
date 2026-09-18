# 03 · Props Schema

> 核心问题：**知道组件用途以后，怎么限制模型只能使用合法 Props？**

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`Component Library`

前两节已经有：

```text
name
description
```

所以系统知道：

```text
有哪些组件
这些组件是什么意思
```

但还不知道：

> **一个组件到底允许怎么配置？**

这一节只新增：

```text
props schema
```

---

## ① 从 Metadata 到 Contract

上一节：

```text
DataTable
description:
用于展示结构化、多行、多列的数据集合
```

这一节：

```text
DataTable
description:
用于展示结构化、多行、多列的数据集合

props:
columns : string[]  required
striped : boolean
```

这样 System 第一次拥有可执行的组件配置契约。

---

## ② 最小 Schema 能表达什么？

当前 MVP 只支持：

```text
string
number
boolean
string[]
required
enum
```

例如：

```text
Button

label   : string required
action  : string required
variant : string enum(primary|secondary|danger)
```

这已经足够验证最核心的问题。

---

## ③ Runtime 现在能检查什么？

模型会返回：

```json
{
  "component": "Button",
  "props": {
    "label": "新建任务",
    "action": "createTask",
    "variant": "primary"
  }
}
```

程序会真正执行检查：

```text
unknown prop
missing required prop
wrong prop type
invalid enum value
```

任何一项不合法：

```text
VALID
→ INVALID
```

整个计划如果包含非法组件配置：

```text
ACCEPTED
→ REJECTED
```

为了真正跑到失败路径，本节还固定加入一个本地非法 Case：

```text
Button

label   = 123
action  = 缺失
variant = rainbow
magic   = true
```

预期 Runtime 能同时识别：

```text
wrong type
missing required
invalid enum
unknown prop
```

并得到：

```text
REJECTED
```

这个 Case 完全本地执行，不调用 LLM。

这和 description 已经不是一回事。

---

## ④ 为什么这是重要的一步？

```text
description
= 自然语言说明

props schema
= 可执行契约
```

Metadata 主要帮助 Model：

```text
应该怎么选
```

Props Schema 开始帮助 Runtime：

```text
这个配置到底允不允许
```

所以这是 Component Library 第一次拥有真正的结构化 Runtime Validation。

---

## ⑤ 仍然没有解决什么？

当前仍然不知道：

```text
Button
到底对应项目里的哪个 React Button？
```

Library 里现在只有：

```text
name
description
props schema
```

还没有：

```text
component reference
```

所以即使：

```text
Button props = VALID
```

也还不能真正把它渲染成项目中的 Button。

---

## ⑥ 运行

```bash
npm run openui:02:03
```

重点看：

```text
Component Library
Model Output
Props Validation
Runtime Decision
Local Invalid Case
What Can We Validate?
```

---

## Done

跑完后能回答：

- [ ] Props Schema 比 Component Metadata 多解决了什么？
- [ ] description 和 props schema 的本质区别是什么？
- [ ] Runtime 现在能检查哪几类 prop 错误？
- [ ] 为什么 Props Schema 已经属于可执行约束？
- [ ] 为什么有了 Props Schema 仍然不能真正 Render 组件？

全部能回答后，本节完成。

下一节：

```text
04 · Component Reference
```

下一节只增加一个问题：

> **这个 Library Definition 到底对应哪个真实组件实现？**
