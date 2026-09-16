# 02 · Tool 学习

> 核心问题：**模型怎样从“会说”变成“能做”？**

当前原则：**每次只增加一个问题和一个能力。**

当前状态：`LEARNING`

---

## 学习路线

```text
01 Local Function
   ↓
02 Tool Schema
   ↓
03 Model Chooses Tool
   ↓
04 Execute Tool
   ↓
05 Tool Result → Model
   ↓
06 Multiple Tools
   ↓
07 Unified Tool Interface
```

当前进度：

```text
01 Local Function        ← 当前
02 Tool Schema           ← 后续
03 Model Chooses Tool    ← 后续
04 Execute Tool          ← 后续
05 Tool Result → Model   ← 后续
06 Multiple Tools        ← 后续
07 Unified Tool Interface← 后续
```

---

# Tool 01 · Local Function

核心问题：**Tool 到底是什么？**

这一节先完全不接 LLM。

先把 Tool 理解成：

> **程序可以执行的一项能力。**

当前只实现：

```ts
function add(a: number, b: number) {
  return a + b
}
```

执行链路：

```text
Input
↓
Execute
↓
Output
```

例如：

```text
123
456
↓
add(123, 456)
↓
579
```

运行：

```bash
npm run tool:01
```

也可以传入自己的数字：

```bash
npm run tool:01 -- 12 34
```

代码：[`01-local-function/index.ts`](./01-local-function/index.ts)

详细说明：[`01-local-function/README.md`](./01-local-function/README.md)

---

## 为什么第一轮不接 LLM？

因为 Tool 本身并不是 AI 专属概念。

```text
普通函数
HTTP API
数据库查询
文件操作
```

都可以成为 Tool 的底层能力。

当前只需要把这件事看清楚：

```text
Tool
= executable capability
= 一个可以执行并得到结果的能力
```

现在还没有：

```text
Tool Schema       ❌
Model Tool Call   ❌
Tool Result       ❌
Tool Registry     ❌
Agent Loop        ❌
```

---

## 下一步为什么是 Tool Schema？

程序员知道：

```ts
add(a, b)
```

但是模型不知道：

```text
add 是什么？
什么时候应该用？
需要哪些参数？
参数类型是什么？
```

所以自然会进入：

```text
Tool 01
先有一个可以执行的能力
↓
Tool 02
再给这个能力一份模型能理解的说明书
```

也就是 **Tool Schema**。

---

## Tool 01 Done 标准

- [ ] 我能用自己的话解释 Tool 是什么。
- [ ] 我知道 Tool 最基础可以只是普通函数。
- [ ] 我能解释 Input / Execute / Output。
- [ ] 我知道当前还没有 LLM 参与。
- [ ] 我知道为什么下一步需要 Tool Schema。

做到这些，就进入 **tool:02 · Tool Schema**。
