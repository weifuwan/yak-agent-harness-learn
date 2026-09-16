# Agent Loop 05 · Loop State

核心问题：**Agent 运行过程中，step / messages / maxSteps / result 这些数据应该放在哪里？**

`agent-loop:04` 已经具备：

```text
Loop
Stop Condition
maxSteps
AgentRunResult
```

但是运行数据仍然是散落变量：

```ts
let step = 0
const maxSteps = 4
const messages = [...]
let result
```

这一节不增加新的 Agent 能力，只解决：

> **怎么把一次 Agent Run 的运行状态统一表示出来？**

---

## Loop State 是什么？

这一节定义：

```ts
type LoopState = {
  step: number
  maxSteps: number
  messages: Array<Record<string, unknown>>
  result?: AgentRunResult
}
```

可以先理解成：

> **LoopState = 这一次 Agent Run 当前运行到哪里的状态快照。**

它回答：

```text
现在第几步？
最多允许多少步？
当前完整 messages 是什么？
任务已经结束了吗？
如果结束，结果是什么？
```

---

## 为什么要收进一个对象？

`agent-loop:04`：

```text
step       → 一个变量
maxSteps   → 一个变量
messages   → 一个变量
result     → 一个变量
```

`agent-loop:05`：

```text
LoopState
├── step
├── maxSteps
├── messages
└── result
```

变化不是为了“少写几个变量”。

真正的变化是开始建立：

```text
Runtime Logic
vs
Runtime State
```

两个边界。

---

## Logic 和 State 怎么区分？

### Runtime Logic

负责：

```text
调用 LLM
解释响应
决定 CONTINUE / DONE
查找 Tool
执行 Tool
判断 maxSteps
```

例如：

```ts
decideNextStep(message)
```

属于 Logic。

### Loop State

负责记录：

```text
step
maxSteps
messages
result
```

例如：

```ts
state.step += 1
state.messages.push(...)
state.result = ...
```

属于 State。

可以记成：

> **Logic 决定下一步做什么；State 记录现在已经发生了什么。**

---

## 初始化状态

代码：[`state.ts`](./state.ts)

```ts
const state = createInitialLoopState({
  maxSteps,
  systemPrompt,
  userPrompt,
})
```

初始状态大致是：

```text
step     = 0
maxSteps = 4
messages = [system, user]
result   = undefined
```

运行过程中只更新这个对象。

---

## 主循环怎么变化？

以前：

```ts
while (step < maxSteps) {
  step += 1

  const response = await callLLM(messages)

  messages.push(...)
  result = ...
}
```

现在：

```ts
while (state.step < state.maxSteps) {
  state.step += 1

  const response = await callLLM(state.messages)

  state.messages.push(...)
  state.result = ...
}
```

注意：

```text
Agent 行为没有改变。
```

仍然是：

```text
LLM
↓
Decision
↓
Tool
↓
Observation
↓
LLM
```

这一轮只是把“运行中的数据”有意识地集中起来。

---

## State 会怎么变化？

初始：

```text
LoopState
step     = 0
messages = 2
result   = running
```

第一次 Tool 后：

```text
LoopState
step     = 1
messages = 4
result   = running
```

第二次 Tool 后：

```text
LoopState
step     = 2
messages = 6
result   = running
```

最终完成：

```text
LoopState
step     = 3
messages = 7
result   = final_answer
```

或者达到上限：

```text
LoopState
step     = 4
result   = max_steps
```

---

## 运行

复用前面的 DeepSeek 和 maxSteps 配置：

```env
MODEL_API_KEY=
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
AGENT_MAX_STEPS=4
```

运行：

```bash
npm run agent-loop:05
```

默认任务：

```text
读取 package.json
↓
得到项目名称
↓
获取当前服务器时间
↓
最终回答
```

运行时重点观察：

```text
[Loop State · initial]

[Loop State · after tool]

[Loop State · done]
```

看同一个 `state` 如何不断变化。

---

## 为什么这一步很重要？

如果 Agent Runtime 后面继续增加：

```text
token usage
开始时间
当前 Tool
error
abort reason
trace id
```

如果全部继续散落：

```text
let xxx
let yyy
let zzz
```

Runtime 会越来越难管理。

所以 `LoopState` 是一个很重要的边界：

```text
一次 Agent Run
↓
拥有自己的 State
↓
Runtime 持续读取 / 更新它
```

但当前不要继续设计复杂 State Machine。

---

## 当前不要做

```text
Agent class          ❌
Runtime class        ❌
State persistence    ❌
Session              ❌
Checkpoint           ❌
Event Store          ❌
AbortController      ❌
Telemetry            ❌
```

这一节只收：

```text
step
maxSteps
messages
result
```

够了。

---

## 04 和 05 的区别

```text
agent-loop:04
解决：Agent 最多能跑多少步？

agent-loop:05
解决：Agent 运行过程中这些数据统一放哪里？
```

所以：

```text
04 = Runtime Boundary
05 = Runtime State
```

---

## Done 标准

- [ ] 我能解释什么是 LoopState。
- [ ] 我知道 `step / maxSteps / messages / result` 为什么属于运行状态。
- [ ] 我能区分 Runtime Logic 和 Runtime State。
- [ ] 我知道 `decideNextStep()` 属于 Logic，而不是 State。
- [ ] 我能看懂同一个 state 在每轮如何被更新。
- [ ] 我知道这一轮没有增加新的 Agent 行为。
- [ ] 我知道为什么下一步可以开始封装 `runAgent()`。

做到这些，就进入 **agent-loop:06 · Minimal Agent Runtime**。
