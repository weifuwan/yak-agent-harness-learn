# Tool 01 · Local Function

核心问题：**Tool 到底是什么？**

这一节先完全不接 LLM。

只做一件事：把 Tool 拉回到最普通的程序概念——**一个可以被程序执行并返回结果的能力。**

---

## 新词：Tool

现在先这样理解：

> **Tool = 程序可以执行的一项能力。**

例如：

```text
add
read_file
write_file
list_files
get_weather
search
```

它们本质上都不是“AI 魔法”。

最基础的时候，就是普通函数、HTTP API、数据库查询、文件操作等可执行能力。

这一节只用最简单的：

```ts
function add(a: number, b: number) {
  return a + b
}
```

---

## 当前流程

```text
输入参数
   ↓
add(a, b)
   ↓
程序执行
   ↓
返回结果
```

比如：

```text
a = 123
b = 456
↓
add(123, 456)
↓
579
```

注意：这里没有模型参与。

```text
LLM          ❌
Tool Schema  ❌
Tool Call    ❌
Agent Loop   ❌
```

---

## 运行

直接运行默认例子：

```bash
npm run tool:01
```

默认相当于：

```text
123 + 456
```

也可以自己传两个数字：

```bash
npm run tool:01 -- 12 34
```

或者：

```bash
npm run tool:01 -- 100 250
```

---

## 运行时会看到什么？

类似：

```text
========== Tool 01 · Local Function ==========
这一节没有 LLM。Tool 先从一个普通可执行函数开始。

[Input]
{ a: 123, b: 456 }

[Execute]
add(a, b)

[Output]
579
```

这里先只观察三个东西：

```text
Input
↓
Execute
↓
Output
```

这其实就是 Tool 最基础的执行模型。

---

## 为什么先不用 LLM？

因为如果一开始就看：

```text
Function Calling
JSON Schema
Tool Call
Tool Result
```

很容易误以为 Tool 是 LLM 特有的东西。

其实不是。

先把它还原成：

```text
一个普通函数
+
输入
+
执行
+
输出
```

后面才会逐步出现新的问题。

---

## 现在还缺什么？

目前人类程序员知道：

```ts
add(a, b)
```

但模型并不知道：

```text
这个函数叫什么？
它是干什么的？
需要几个参数？
参数叫什么？
参数是什么类型？
```

所以自然会出现下一步的问题：

> **怎么把一个 Tool 的“使用说明”告诉模型？**

这就是 `tool:02 · Tool Schema`。

---

## 当前不要做

```text
Tool Schema        ❌
JSON Schema        ❌
LLM Tool Calling   ❌
Tool Registry      ❌
Tool Interface     ❌
Permission         ❌
Agent Loop         ❌
```

现在不要抽象。

只有一个 `add()`，直接调用就是最清楚的实现。

---

## Done 标准

- [ ] 我能用自己的话解释 Tool 是什么。
- [ ] 我知道 Tool 最基础可以只是一个普通函数。
- [ ] 我能指出 Tool 的 Input / Execute / Output。
- [ ] 我知道当前 `add()` 还没有任何 LLM 能力。
- [ ] 我知道模型目前还不知道 `add()` 的名字、用途和参数。

做到这些，`tool:01` 就够了。

下一步进入 **tool:02 · Tool Schema**。
