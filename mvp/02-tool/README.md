# 02 · Tool 学习

> 核心问题：**模型怎样从“会说”变成“能做”？**

当前原则：**每次只增加一个问题和一个能力。**

当前状态：`LEARNING`

---

## 快速测试

### Tool 01 · Local Function

```bash
npm run tool:01
```

也可以传参数：

```bash
npm run tool:01 -- 12 34
```

### Tool 02 · Tool Schema

```bash
npm run tool:02
```

这一轮没有 LLM，只观察：

```text
add()
= 真正可执行的函数

Tool Schema
= 给模型看的结构化说明书
```

独立说明：[`02-tool-schema/README.md`](./02-tool-schema/README.md)

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
01 Local Function         ✅
02 Tool Schema            ← 当前
03 Model Chooses Tool     ← 后续
04 Execute Tool           ← 后续
05 Tool Result → Model    ← 后续
06 Multiple Tools         ← 后续
07 Unified Tool Interface ← 后续
```

---

# Tool 01 · Local Function

核心问题：**Tool 到底是什么？**

先理解成：

> **Tool = 程序可以执行的一项能力。**

当前实现：

```ts
function add(a: number, b: number) {
  return a + b
}
```

```text
Input
↓
Execute
↓
Output
```

运行：

```bash
npm run tool:01 -- 123 456
```

详细说明：[`01-local-function/README.md`](./01-local-function/README.md)

---

# Tool 02 · Tool Schema

核心问题：**模型怎么知道 Tool 叫什么、做什么、需要哪些参数？**

这一轮给 `add()` 增加一份结构化说明：

```text
name
↓
Tool 名字

description
↓
Tool 是做什么的

parameters
↓
有哪些参数

type
↓
参数是什么类型

required
↓
哪些参数必须提供
```

当前 Schema 大致是：

```json
{
  "type": "function",
  "function": {
    "name": "add",
    "description": "计算两个数字之和。",
    "parameters": {
      "type": "object",
      "properties": {
        "a": { "type": "number" },
        "b": { "type": "number" }
      },
      "required": ["a", "b"],
      "additionalProperties": false
    }
  }
}
```

最重要的是区分：

```text
add()
= 给程序执行

addToolSchema
= 给模型理解
```

Schema 本身不会执行函数。

运行：

```bash
npm run tool:02
```

代码：[`02-tool-schema/index.ts`](./02-tool-schema/index.ts)

详细说明：[`02-tool-schema/README.md`](./02-tool-schema/README.md)

---

## 下一步为什么是 Model Chooses Tool？

现在已经有：

```text
add()
+
add Tool Schema
```

但模型还没看到这份 Schema。

下一步才会真正把 Schema 发给 LLM，然后观察：

```text
User:
帮我算 123 + 456

↓
LLM 看到了 add Tool Schema

↓
模型是否会返回：
Tool Call
name = add
arguments = { a: 123, b: 456 }
```

这一阶段先只观察模型的选择，仍然可以不执行 `add()`。

---

## 当前 Done 标准

### Tool 01

- [ ] 我能用自己的话解释 Tool 是什么。
- [ ] 我知道 Tool 最基础可以只是普通函数。
- [ ] 我能解释 Input / Execute / Output。

### Tool 02

- [ ] 我能解释 Tool Schema 是什么。
- [ ] 我知道 Function 和 Schema 的职责不同。
- [ ] 我能解释 `name / description / parameters / required`。
- [ ] 我知道 Schema 只是描述，不负责执行。
- [ ] 我知道当前还没有把 Schema 发给 LLM。

做到这些，就进入 **tool:03 · Model Chooses Tool**。
