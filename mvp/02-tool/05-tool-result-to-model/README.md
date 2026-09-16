# Tool 05 · Tool Result → Model

核心问题：**Tool 已经执行出结果了，模型怎么知道这个结果？**

`tool:04` 已经做到：

```text
User
↓
DeepSeek
↓
Tool Call
↓
Application
↓
add(123, 456)
↓
579
↓
STOP
```

问题是：

> **579 现在只存在于我们的程序里，模型还不知道。**

所以这一节第一次把 Tool Result 再交给模型。

---

## 完整流程

```text
User
↓
第一次 LLM 调用
↓
Tool Call
↓
Application 执行 Tool
↓
Tool Result
↓
role = tool
↓
第二次 LLM 调用
↓
Final Assistant
```

例如：

```text
User:
请计算 123 + 456

↓

DeepSeek:
调用 add
arguments = {"a":123,"b":456}

↓

Application:
add(123, 456)

↓

Tool Result:
579

↓

DeepSeek:
123 + 456 = 579。
```

---

## 为什么需要第二次 LLM 调用？

第一次模型只知道：

```text
我需要调用 add
```

它并不知道程序执行后的真实结果。

所以应用执行完：

```text
add(123, 456)
→ 579
```

必须把结果重新放进 `messages`。

然后再调用一次模型。

所以同一个用户问题会出现：

```text
LLM Request #1
→ 产生 Tool Call

LLM Request #2
→ 读取 Tool Result，生成最终回答
```

---

## 新角色：role = tool

前面已经见过：

```text
system
user
assistant
```

现在第一次出现：

```text
role = tool
```

Tool Result 消息大致是：

```json
{
  "role": "tool",
  "tool_call_id": "call_xxx",
  "content": "579"
}
```

可以先这样理解：

```text
role = tool
= 这条消息不是用户说的，也不是模型说的
= 这是外部 Tool 执行后的结果
```

---

## 为什么需要 tool_call_id？

第一次模型返回 Tool Call 时会带：

```text
id = call_xxx
```

当应用返回 Tool Result 时，需要写：

```text
tool_call_id = call_xxx
```

这样模型才能知道：

```text
579
```

对应的是哪一次 Tool Call。

关系是：

```text
Tool Call
id = call_123
↓
Application 执行
↓
Tool Result
role = tool
tool_call_id = call_123
content = "579"
```

这个关联以后多个 Tool Call 时会更加重要。

---

## 第二次请求里的 messages 长什么样？

第一次请求只有：

```text
system
user
```

模型返回 Tool Call 后，应用把这条 Assistant Message 也加入历史：

```text
system
user
assistant(tool_calls)
```

然后再加入 Tool Result：

```text
system
user
assistant(tool_calls)
tool
```

第二次模型请求看到的就是完整历史：

```text
User 想做什么
↓
Assistant 为什么请求 Tool
↓
Tool 真正执行出了什么结果
```

这其实和前面学过的 Multi-turn Messages 是同一个思想：

> **模型不会自动知道程序刚刚发生了什么，应用必须把信息重新放进下一次请求。**

---

## Tool Result 和 Assistant Response 不一样

这一点很重要。

Tool Result：

```text
579
```

是程序执行得到的结果。

Final Assistant：

```text
123 + 456 = 579。
```

是模型根据 Tool Result 组织出来的用户回答。

所以：

```text
Tool
负责执行 / 提供结果

LLM
负责理解结果 / 继续回答
```

---

## 为什么代码里第二次 tool_choice = none？

这一节只想学习一个最小闭环：

```text
一次 Tool Call
↓
一次 Tool Result
↓
一次 Final Assistant
```

所以第二次请求明确设置：

```text
tool_choice = none
```

意思是：

> **这次不要再继续调用 Tool，只根据已有 Tool Result 完成回答。**

这样我们不会提前进入：

```text
LLM
↓
Tool
↓
LLM
↓
Tool
↓
LLM
...
```

这种循环属于后面的 Agent Loop。

---

## 运行

使用前面已经配置好的 DeepSeek：

```env
MODEL_API_KEY=
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
```

运行：

```bash
npm run tool:05 -- "请使用可用工具计算 123 + 456"
```

重点观察终端里的两个区块：

```text
First LLM Request
Second LLM Request
```

尤其看第二次 `messages`：

```text
system
user
assistant(tool_calls)
tool(tool_call_id + content)
```

---

## 当前完整链路

到 `tool:05`，已经第一次形成完整 Tool Calling：

```text
User
↓
LLM
↓
Tool Call
↓
Application
↓
Tool
↓
Tool Result
↓
LLM
↓
Assistant
```

---

## 当前不要做

```text
多个 Tool               ❌
Tool Registry           ❌
自动循环 Tool Call       ❌
无限 Agent Loop         ❌
Permission              ❌
Retry                   ❌
```

这一节只解决：

> **Tool Result 怎么回到模型，并让模型继续完成回答。**

---

## Done 标准

- [ ] 我知道为什么 Tool 执行完还需要再次调用 LLM。
- [ ] 我能解释 `role = tool`。
- [ ] 我能解释 `tool_call_id` 的作用。
- [ ] 我知道第一次 Assistant Tool Call Message 也要保留在 messages 中。
- [ ] 我能看懂第二次请求中的 `system / user / assistant(tool_calls) / tool`。
- [ ] 我能区分 Tool Result 和 Final Assistant。
- [ ] 我知道一个用户请求为什么会产生两次 LLM 请求。
- [ ] 我知道当前还不是 Agent Loop，只是一次固定闭环。

做到这些，`tool:05` 就够了。

下一步进入 **tool:06 · Multiple Tools**。
