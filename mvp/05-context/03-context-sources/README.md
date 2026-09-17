# Context 03 · Context Sources

> 核心问题：**Context Builder 除了 Session History，还应该从哪里获得信息？**

`context:02` 已经建立了：

```text
Session
↓
buildContext()
↓
Model Context
↓
LLM
```

但当时 Builder 的输入本质上仍然只有：

```text
System
Session History
Current Task
```

这一轮第一次明确：

> **Context 是多个信息源组装出来的本轮工作输入。**

最小来源定义：

```ts
type ContextSources = {
  systemPrompt: string
  currentTask: string
  sessionHistory: Message[]
  projectContext?: string
}
```

流程变成：

```text
System Prompt ───────┐
Current Task ────────┤
Session History ─────┼→ Context Builder → Model Context → LLM
Project Context ─────┘
```

---

## 运行

```bash
npm run context:03
```

默认使用完全相同的问题：

```text
这个项目使用什么运行时、语言和 TypeScript 执行器？
```

先运行：

```text
Case A
System + Session History + Current Task

没有 Project Context
```

Session History 只包含之前关于 Session / Agent Loop 的讨论，因此模型没有项目技术栈事实。

再运行：

```text
Case B
System + Session History + Project Context + Current Task
```

其中 Project Context 明确提供：

```text
Node >=22
TypeScript 5.9
使用 tsx
```

当前任务完全相同，变化的只有 Context Source。

---

## 这一轮真正增加了什么？

不是更多 Token，也不是更复杂的 Prompt。

而是 Context Builder 的输入边界从：

```text
一个 Session
```

变成：

```text
一组 Context Sources
```

因此：

```text
Session
= 其中一个信息源

Context
= 多个来源组装后的本轮模型输入
```

---

## 为什么 Project Context 不属于 Session？

Session 记录：

```text
用户说过什么
模型做过什么
Tool 返回过什么
```

Project Context 表示：

```text
这个项目本身现在是什么样
```

例如：

```text
技术栈
目录结构
配置
相关文件内容
```

它们的生命周期和来源都不同，所以不应该把所有东西都硬塞进 Session。

---

## 当前仍然没有 History Selection

这一轮仍然：

```text
sessionHistory 有多少
↓
全部进入 Model Context
```

所以 `context:03` 还没有解决长历史问题。

下一轮：

```text
context:04 · History Selection
```

才开始回答：

> **Session History 很长时，这一轮到底应该选哪些？**

---

## Done 标准

- [ ] 我知道 Context 不等于 Session History。
- [ ] 我能解释 System Prompt / Current Task / Session History / Project Context 的区别。
- [ ] 我知道 Session 只是 Context 的一个来源。
- [ ] 我知道 Context Builder 负责把多个来源组装成 Model Context。
- [ ] 我知道这一轮仍然没有 History Selection。
- [ ] 我知道下一步为什么要开始选择历史。

做到这些，就进入 **context:04 · History Selection**。
