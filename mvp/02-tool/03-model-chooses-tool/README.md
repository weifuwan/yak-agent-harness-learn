# Tool 03 · Model Chooses Tool

核心问题：**模型怎么表达“我想调用某个 Tool”？**

`tool:01` 已经知道：

```text
Tool
= 一个可以被程序执行的能力
```

`tool:02` 又给 `add()` 增加了 Tool Schema：

```text
name
description
parameters
required
```

但前两节都还没有真正把 Tool Schema 发给模型。

这一节第一次做：

```text
User Prompt
+
Tool Schema
↓
Kimi
↓
模型决定：
直接回答？
还是返回 tool_calls？
```

---

## 这一节第一次接 LLM

当前使用 Kimi / Moonshot Chat Completions API。

需要 `.env`：

```env
KIMI_API_KEY=
KIMI_BASE_URL=https://api.moonshot.cn/v1
KIMI_MODEL=kimi-k2.6
```

如果你已经在前面的 LLM 学习阶段配置过 Kimi，可以直接复用。

Kimi 当前 Tool Calling 使用 OpenAI-compatible 的 `tools / tool_calls` 结构。

---

## Tool Schema 怎么进入请求？

还是上一节的 `add`：

```ts
function add(a: number, b: number) {
  return a + b
}
```

它对应的 Schema：

```json
{
  "type": "function",
  "function": {
    "name": "add",
    "description": "计算两个数字之和。当用户需要做加法计算时使用。",
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

这一次把它放进请求：

```json
{
  "model": "kimi-k2.6",
  "messages": [
    {
      "role": "user",
      "content": "请使用可用工具计算 123 + 456。"
    }
  ],
  "tools": [
    "add 的 Tool Schema"
  ],
  "tool_choice": "auto"
}
```

这里第一次认识两个字段：

```text
tools
= 这一次告诉模型：你有哪些 Tool 可以使用

tool_choice = auto
= 是否使用 Tool、使用哪个 Tool，由模型自己决定
```

---

## 模型选择 Tool 时，会返回什么？

当模型决定调用 `add` 时，返回结构大致是：

```json
{
  "finish_reason": "tool_calls",
  "message": {
    "role": "assistant",
    "tool_calls": [
      {
        "id": "...",
        "type": "function",
        "function": {
          "name": "add",
          "arguments": "{\"a\":123,\"b\":456}"
        }
      }
    ]
  }
}
```

这几个字段非常重要。

### finish_reason

```text
finish_reason = tool_calls
```

可以先理解成：

> **这一次模型没有直接完成面向用户的回答，而是在这里暂停，要求应用先执行 Tool。**

### tool_calls

```text
message.tool_calls
```

表示模型希望进行的一次或多次工具调用。

每一项里最重要的是：

```text
function.name
= 想调用哪个 Tool

function.arguments
= 想给这个 Tool 传什么参数
```

---

## arguments 为什么是字符串？

你会看到：

```json
"arguments": "{\"a\":123,\"b\":456}"
```

它的内容虽然是 JSON，但 API 返回的是一个序列化后的字符串。

所以代码里会做：

```ts
JSON.parse(toolCall.function.arguments)
```

最后得到：

```ts
{
  a: 123,
  b: 456
}
```

注意：

> **这一节只是解析参数，不执行 `add()`。**

---

## 运行

推荐先跑一个明显需要 Tool 的问题：

```bash
npm run tool:03 -- "请使用可用工具计算 123 + 456"
```

重点观察：

```text
finish_reason: tool_calls
name: add
arguments: {"a":123,"b":456}
```

然后再试一个不需要这个 Tool 的问题：

```bash
npm run tool:03 -- "请用一句话解释 Java HashMap"
```

因为：

```text
tool_choice = auto
```

模型可以选择：

```text
不使用 add
↓
直接回答
↓
finish_reason 可能是 stop
```

这个对照非常重要。

---

## 现在的完整流程

```text
add()
程序真正能执行的能力

+

Tool Schema
告诉模型 add 是什么

↓

User Prompt + tools

↓

Kimi

↓

模型自己决定

├── 不需要 Tool
│   └── 直接回答
│
└── 需要 Tool
    └── 返回 tool_calls
        ├── name = add
        └── arguments = { a, b }
```

当前停在这里。

---

## 特别重要：模型没有执行 Tool

看到：

```text
tool_calls:
  name = add
  arguments = { a: 123, b: 456 }
```

不要误解成：

```text
模型已经执行了 add() ❌
```

实际上只是：

```text
模型输出了一份“调用意图”
```

它相当于告诉我们的程序：

> **我认为现在应该调用 `add`，参数是 123 和 456。**

真正执行：

```ts
add(123, 456)
```

必须由我们的应用程序完成。

这就是下一节 `tool:04 · Execute Tool`。

---

## 这一阶段新认识的词

```text
Tools
= 发送给模型的 Tool Schema 列表

Tool Choice
= 模型如何选择是否调用 Tool

Tool Call
= 模型生成的一次工具调用意图

finish_reason = tool_calls
= 模型当前停下来等待 Tool 执行结果
```

---

## 当前不要做

```text
执行 add()             ❌
Tool Result            ❌
role = tool            ❌
把结果重新交给模型      ❌
Tool Registry          ❌
Agent Loop             ❌
```

这一节只看：

> **模型如何从 Tool Schema 中选择 Tool，并生成参数。**

---

## Done 标准

- [ ] 我知道 Tool Schema 是通过 `tools` 发给模型的。
- [ ] 我能解释 `tool_choice: auto`。
- [ ] 我能解释 `finish_reason: tool_calls`。
- [ ] 我知道 `message.tool_calls[]` 是什么。
- [ ] 我能从 Tool Call 中找到 `function.name`。
- [ ] 我能从 Tool Call 中找到并解析 `function.arguments`。
- [ ] 我知道 Tool Call 只是“调用意图”，并没有真的执行 Tool。
- [ ] 我实际对比过“需要 add”和“不需要 add”的两个问题。

做到这些，`tool:03` 就够了。

下一步进入 **tool:04 · Execute Tool**。
