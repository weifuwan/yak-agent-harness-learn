# Agent Loop 01 · Manual Two-Step

核心问题：**在真正写循环之前，我们现在的 Tool Calling 流程到底是怎么跑的？**

这一节不引入 `while`。

只把 `tool:05` 那种固定流程重新拆开看清楚：

```text
User
↓
LLM #1
↓
Tool Call
↓
Execute Tool
↓
Tool Result
↓
LLM #2
↓
Final Assistant
↓
STOP
```

它已经有：

```text
LLM → Tool → LLM
```

但它还不是 Agent Loop。

---

## 为什么还不是 Agent Loop？

因为当前每一步都是程序提前写死的：

```text
第一次调用 LLM
↓
最多执行一次 Tool
↓
第二次调用 LLM
↓
结束
```

也就是说：

```text
LLM 调用次数   = 写死
Tool 执行次数  = 写死
结束位置       = 写死
```

程序没有根据模型下一步的状态自动决定：

```text
继续？
还是停止？
```

---

## 这一节复用 Tool 阶段的成果

这里不再重新实现：

```text
Tool Schema
参数校验
Tool Registry
Tool.execute()
```

直接复用 `tool:07` 里的 `addTool`。

因为 Agent Loop 阶段现在关注的是：

> **控制流程。**

不是重新学习 Tool。

---

## 当前固定流程

### Step 1 · First LLM Call

第一次请求：

```text
system
user
+
add Tool Schema
```

模型可能：

```text
直接回答
```

也可能返回：

```text
Tool Call
name = add
arguments = {"a":123,"b":456}
```

---

### Step 2 · Execute One Tool

如果模型返回 Tool Call：

```text
Registry.get(name)
↓
tool.execute(arguments)
↓
Tool Result
```

例如：

```text
add(123, 456)
↓
579
```

然后把：

```text
assistant(tool_calls)
tool(tool_call_id + 579)
```

加入 `messages`。

---

### Step 3 · Second LLM Call

第二次调用模型时，当前代码故意使用：

```text
tool_choice = none
```

意思是：

> **第二次调用必须直接生成最终回答。**

所以最终会得到类似：

```text
123 + 456 = 579。
```

然后程序：

```text
STOP
```

---

## 运行

```bash
npm run agent-loop:01 -- "请使用可用工具计算 123 + 456"
```

默认也是这个问题：

```bash
npm run agent-loop:01
```

运行时重点看：

```text
Step 1 · First LLM Call
Step 2 · Execute One Tool
Step 3 · Second LLM Call
STOP
```

---

## 真正的问题在哪里？

假设任务不是简单加法，而是：

```text
读取 package.json，
然后根据里面的信息继续读取另一个文件，
再总结结果。
```

可能出现：

```text
LLM
↓
read_file(package.json)
↓
Tool Result
↓
LLM
↓
还想调用 read_file(README.md)
```

但当前固定代码已经规定：

```text
第二次 LLM 调用
↓
必须 Final Assistant
↓
STOP
```

所以它无法自然继续。

这就是下一步真正的问题：

> **如果模型还想调用 Tool，程序能不能自动继续？**

---

## 下一节为什么是 Basic Loop？

现在的代码本质上是：

```ts
const first = await callLLM()

executeTool()

const second = await callLLM()

return second
```

下一节会第一次变成：

```ts
while (true) {
  const response = await callLLM()

  if (response 要调用 Tool) {
    executeTool()
    continue
  }

  return response
}
```

也就是：

```text
固定步骤
↓
自动循环
```

---

## 当前不要做

```text
while loop       ❌
Stop Condition   ❌
Max Steps        ❌
Loop State       ❌
Agent Runtime    ❌
Retry            ❌
Permission       ❌
```

这一节只把“固定流程”的限制看清楚。

---

## Done 标准

- [ ] 我能画出 `LLM #1 → Tool → LLM #2 → STOP`。
- [ ] 我知道当前流程为什么还不是 Agent Loop。
- [ ] 我知道 LLM 调用次数是程序写死的。
- [ ] 我知道 Tool 执行次数也是程序写死的。
- [ ] 我知道第二次请求为什么使用 `tool_choice = none`。
- [ ] 我能解释：如果第二次模型还需要 Tool，当前程序为什么处理不了。
- [ ] 我知道下一步需要把固定流程改成自动循环。

做到这些，就进入 **agent-loop:02 · Basic Loop**。
