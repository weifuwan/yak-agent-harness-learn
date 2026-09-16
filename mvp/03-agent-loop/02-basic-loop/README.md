# Agent Loop 02 · Basic Loop

核心问题：**怎么让 `LLM → Tool → LLM` 不再是写死的两步，而是根据模型状态自动继续？**

`agent-loop:01` 的流程是：

```text
LLM #1
↓
最多一次 Tool
↓
LLM #2
↓
STOP
```

问题是：

```text
如果 LLM #2 还需要另一个 Tool 呢？
```

上一节处理不了。

这一节第一次真正引入：

```ts
while (true) {
  // LLM
  // Tool
  // continue / break
}
```

---

## 这次真正新增什么？

只新增一个能力：**循环。**

核心逻辑可以先压缩成：

```ts
while (true) {
  const response = await callLLM(messages)

  if (response 有 Tool Call) {
    const result = await executeTool()
    messages.push(toolResult)
    continue
  }

  break
}
```

也就是：

```text
LLM
↓
有 Tool Call？
├── YES
│   ↓
│  Execute Tool
│   ↓
│  Tool Result
│   ↓
│  continue
│   └──────────────→ 回到 LLM
│
└── NO
    ↓
 Final Assistant
    ↓
   break
```

---

## 和 agent-loop:01 的本质区别

### 01 · Manual Two-Step

```text
LLM #1
Tool
LLM #2
STOP
```

调用次数是程序提前规定的。

### 02 · Basic Loop

```text
LLM
↓
Tool?
↓
继续 / 结束
```

运行多少轮不再提前固定。

所以第一次有了：

> **模型产生 Tool Call，驱动程序继续下一轮。**

---

## 默认实验

默认 Prompt：

```text
请先读取 package.json 找到项目名称，
再获取当前服务器时间，
最后告诉我项目名称和当前时间。
每次只调用一个工具。
```

当前可用 Tool 仍然复用 `tool:07`：

```text
add
get_current_time
read_file
```

理想情况下可能看到：

```text
Loop Step 1
↓
read_file(package.json)
↓
Tool Result
↓
continue

Loop Step 2
↓
get_current_time()
↓
Tool Result
↓
continue

Loop Step 3
↓
没有 Tool Call
↓
Final Assistant
↓
break
```

具体顺序由模型决定，不要求每次完全一致。

---

## 运行

直接运行默认多步场景：

```bash
npm run agent-loop:02
```

也可以自己传问题：

```bash
npm run agent-loop:02 -- "请读取 package.json，然后告诉我项目名称"
```

或者：

```bash
npm run agent-loop:02 -- "请计算 123 + 456，然后告诉我当前服务器时间。每次只调用一个工具。"
```

---

## messages 为什么会不断增长？

开始只有：

```text
system
user
```

第一次 Tool Call 后：

```text
system
user
assistant(tool_calls)
tool(result)
```

如果模型又调用第二个 Tool：

```text
system
user
assistant(tool_calls #1)
tool(result #1)
assistant(tool_calls #2)
tool(result #2)
```

然后再次把整个 messages 发给模型。

所以 Agent Loop 其实一直在做：

```text
Model
↓
Action
↓
Execute
↓
Observation 写入 messages
↓
Model
```

这已经开始接近真正的 Agent 执行过程。

---

## 当前最简单的 continue / break

这一节暂时使用非常粗糙的判断：

```text
有 tool_calls
→ continue

没有 tool_calls
→ break
```

注意：这只是最小实现。

我们还没有认真回答：

```text
finish_reason 应不应该看？
content 为空怎么办？
模型异常结束怎么办？
Tool 执行失败算继续还是结束？
```

这些就是下一轮：

**agent-loop:03 · Stop Condition**。

---

## 为什么代码里有 DEMO_CIRCUIT_BREAKER？

真正的 `while (true)` 如果模型异常，可能不断发送真实 API 请求。

所以演示代码里放了一个保险丝：

```text
DEMO_CIRCUIT_BREAKER = 12
```

它只是防止学习代码意外失控和持续计费。

这一节不要把它当成 Agent 设计的一部分。

真正的：

```text
maxSteps 是什么？
为什么需要？
达到上限后怎么办？
```

会在 `agent-loop:04 · Max Steps` 正式学习。

---

## 当前仍然不要做

```text
正式 Stop Condition 设计 ❌
可配置 maxSteps          ❌
Loop State 对象          ❌
runAgent() Runtime       ❌
并行 Tool Calls          ❌
Permission               ❌
Retry                     ❌
```

当前只看：

> **固定两步是怎么变成 while 循环的。**

---

## Done 标准

- [ ] 我能解释为什么 Manual Two-Step 不够。
- [ ] 我能看懂 `while (true)` 在 Agent 中做什么。
- [ ] 我知道有 Tool Call 时为什么要 `continue`。
- [ ] 我知道没有 Tool Call 时为什么暂时 `break`。
- [ ] 我知道每次 Tool Result 都会追加进 messages。
- [ ] 我知道下一轮 LLM 会重新读取完整 messages。
- [ ] 我理解 LLM / Tool 到底运行几轮已经不再提前固定。
- [ ] 我知道当前停止判断还非常粗糙。
- [ ] 我知道演示保险丝不等于正式的 maxSteps 设计。

做到这些，`agent-loop:02` 就够了。

下一步进入 **agent-loop:03 · Stop Condition**。
