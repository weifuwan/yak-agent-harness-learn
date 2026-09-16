# Tool 02 · Tool Schema

核心问题：**模型怎么知道一个 Tool 叫什么、做什么、需要哪些参数？**

在 `tool:01` 里，我们只有一个普通函数：

```ts
function add(a: number, b: number) {
  return a + b
}
```

程序员看得懂它。

但模型并不能直接从你的 TypeScript 源码里自动得到稳定、结构化的 Tool 说明。

所以这一节只增加一个东西：**Tool Schema**。

---

## 新词：Tool Schema

现在先这样理解：

> **Tool Schema = 给模型看的 Tool 使用说明书。**

它描述：

```text
name
↓
这个 Tool 叫什么

description
↓
这个 Tool 是干什么的

parameters
↓
调用它需要哪些参数

parameter type
↓
每个参数是什么类型

required
↓
哪些参数必须提供
```

注意：

> **Schema 只是描述，不是执行。**

---

## Function 和 Schema 是两回事

### 真正执行的函数

```ts
function add(a: number, b: number): number {
  return a + b
}
```

它属于程序执行世界：

```text
Input
↓
add(a, b)
↓
Output
```

### 给模型看的 Schema

```json
{
  "type": "function",
  "function": {
    "name": "add",
    "description": "计算两个数字之和。",
    "parameters": {
      "type": "object",
      "properties": {
        "a": {
          "type": "number",
          "description": "第一个加数。"
        },
        "b": {
          "type": "number",
          "description": "第二个加数。"
        }
      },
      "required": ["a", "b"],
      "additionalProperties": false
    }
  }
}
```

它属于模型理解世界：

```text
Tool Schema
↓
模型知道：
- 有一个 add
- 它可以做加法
- 需要 a 和 b
- a / b 都是 number
```

---

## 为什么要用结构化 Schema？

当然也可以写一句自然语言：

```text
有一个 add 函数，可以把两个数字相加。
```

但很快就会出现问题：

```text
参数名是什么？
参数类型是什么？
哪些参数必填？
能不能多传参数？
嵌套对象怎么办？
数组怎么办？
```

所以 Tool 描述通常会使用结构化 Schema。

这一节使用的是接近后面 Function Calling 会直接使用的 JSON Schema 形式。

---

## 当前流程

现在还没有 LLM 调用。

```text
                    ┌→ add()
                    │  真正执行能力
Tool
                    │
                    └→ Tool Schema
                       给模型看的说明
```

也可以记成：

```text
Function
= 怎么做

Schema
= 怎么告诉模型“它能做什么、怎么调用”
```

---

## 运行

直接运行：

```bash
npm run tool:02
```

终端会打印两部分：

```text
[Executable Function]
add() 的代码

[Tool Schema]
name / description / parameters / required
```

然后把 Schema 中几个最关键的字段单独打印出来。

代码：[`index.ts`](./index.ts)

---

## 这一步模型还做不了什么？

虽然现在已经有 Tool Schema：

```text
add()
+
add Tool Schema
```

但我们还没有把 Schema 发给 LLM。

所以模型现在仍然不会：

```text
看到用户问题
↓
判断应该使用 add
↓
返回 add 的参数
```

当前还只是：

```text
程序员定义了 Tool
+
程序员定义了 Tool 的结构化说明
```

---

## 下一步自然出现的问题

现在我们终于可以把这份 Schema 给模型了。

比如用户说：

```text
帮我算一下 123 + 456
```

接下来真正想观察的是：

> **模型看到 add 的 Tool Schema 后，会不会选择这个 Tool，并给出参数？**

理想上会出现类似：

```text
Tool Call
name: add
arguments:
{
  "a": 123,
  "b": 456
}
```

注意：下一阶段仍然可以先不执行 `add()`。

先只观察模型怎么表达：

> “我要调用这个 Tool。”

这就是 `tool:03 · Model Chooses Tool`。

---

## 当前不要做

```text
真正调用 LLM       ❌
Model Tool Call     ❌
执行 Tool Call      ❌
Tool Result         ❌
Tool Registry       ❌
Tool Interface      ❌
Agent Loop          ❌
```

这一轮只增加 **Schema**。

---

## Done 标准

- [ ] 我能解释 Tool Schema 是什么。
- [ ] 我知道 `add()` 和 `addToolSchema` 不是同一个东西。
- [ ] 我能解释 `name / description / parameters / required`。
- [ ] 我知道 Schema 是给模型理解的，不负责真正执行。
- [ ] 我知道为什么结构化 Schema 比一段自然语言更稳定。
- [ ] 我知道当前还没有把 Schema 发给模型。

做到这些，`tool:02` 就够了。

下一步进入 **tool:03 · Model Chooses Tool**。
