# Tool 04 · Execute Tool

核心问题：**模型已经返回 Tool Call 了，谁真正执行 Tool？**

答案：**应用程序。**

`tool:03` 停在这里：

```text
User
↓
DeepSeek
↓
Tool Call
name = add
arguments = { a: 123, b: 456 }
↓
STOP
```

这一节只多一步：

```text
Tool Call
↓
Application 校验
↓
add(123, 456)
↓
579
```

---

## 先把边界分清楚

当前有三个角色：

```text
LLM
= 决定“想调用什么”

Application
= 解析、校验、调度、执行

Tool
= 真正被执行的能力
```

所以模型返回：

```text
name = add
arguments = { a: 123, b: 456 }
```

并不代表 `add()` 已经运行。

真正运行发生在我们的 Node 程序里：

```ts
const result = add(123, 456)
```

---

## 为什么执行前必须校验？

DeepSeek 官方文档也明确提醒：模型生成的 `function.arguments` 不保证一定是合法 JSON，也可能包含 Schema 里没有定义的参数。

所以不能直接：

```ts
add(...JSON.parse(arguments))
```

当前代码按这个顺序处理：

```text
1. 校验 Tool name
2. JSON.parse(arguments)
3. 校验 arguments 类型
4. 执行 add()
5. 得到 Tool Result
```

### 1. 校验 Tool name

当前程序只认识：

```text
add
```

所以：

```ts
if (name !== "add") {
  throw new Error(...)
}
```

### 2. 解析 arguments

模型返回的通常是字符串：

```json
"{\"a\":123,\"b\":456}"
```

程序需要：

```ts
JSON.parse(rawArguments)
```

### 3. 校验参数

当前要求：

```text
a = finite number
b = finite number
```

只有通过校验，才执行：

```ts
add(a, b)
```

---

## 运行

沿用前面 DeepSeek 配置：

```env
MODEL_API_KEY=
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
```

运行：

```bash
npm run tool:04 -- "请使用可用工具计算 123 + 456"
```

重点观察：

```text
[Model Decision]
finish_reason: tool_calls

[1. Validate Tool Name]
OK: add

[2. Parse & Validate Arguments]
{ a: 123, b: 456 }

[3. Execute Tool]
add(123, 456)

[4. Tool Result]
579
```

---

## 当前完整流程

```text
User Prompt
+
Tool Schema
↓
DeepSeek
↓
Tool Call
├── name = add
└── arguments = { a, b }
↓
Application
├── 校验 name
├── 解析 arguments
└── 校验参数
↓
add(a, b)
↓
Tool Result
```

这时候第一次真正出现：

> **模型提出调用意图，应用程序执行真实能力。**

---

## Tool Result 现在去哪？

当前只打印：

```text
579
```

然后停止。

还没有：

```text
role = tool              ❌
tool_call_id             ❌
把 579 发回 DeepSeek      ❌
让模型生成最终回答         ❌
```

所以这一节还没有完整闭环。

完整链路应该是：

```text
User
↓
LLM
↓
Tool Call
↓
Execute Tool
↓
Tool Result
↓
LLM
↓
Assistant
```

但当前只做到：

```text
User
↓
LLM
↓
Tool Call
↓
Execute Tool
↓
Tool Result
↓
STOP
```

下一节 `tool:05` 再解决“Tool Result 怎么回到模型”。

---

## 当前不要做

```text
role = tool            ❌
tool_call_id           ❌
第二次 LLM 请求        ❌
Tool Registry          ❌
Multiple Tools         ❌
Agent Loop             ❌
```

这一节只理解执行边界。

---

## Done 标准

- [ ] 我知道模型不会自己执行本地函数。
- [ ] 我能解释 LLM / Application / Tool 三者的职责。
- [ ] 我知道为什么 Tool name 要校验。
- [ ] 我知道为什么 `function.arguments` 不能直接信任。
- [ ] 我能看懂 arguments 的 JSON 解析和类型校验。
- [ ] 我知道真正的 `add()` 是由应用程序调用的。
- [ ] 我能区分 Tool Call 和 Tool Result。
- [ ] 我知道当前 Tool Result 还没有回到模型。

做到这些，`tool:04` 就够了。

下一步进入 **tool:05 · Tool Result → Model**。
