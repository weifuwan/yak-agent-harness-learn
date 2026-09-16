# 03 · Agent Loop 学习

> 核心问题：**谁负责让 LLM → Tool → LLM 持续运行，又什么时候停止？**

当前原则：**每次只增加一个问题和一个能力。**

当前状态：`LEARNING`

---

## 学习路线

```text
01 Manual Two-Step
   ↓
02 Basic Loop
   ↓
03 Stop Condition
   ↓
04 Max Steps
   ↓
05 Loop State
   ↓
06 Minimal Agent Runtime
```

当前进度：

```text
01 Manual Two-Step       ✅
02 Basic Loop            ✅
03 Stop Condition        ✅
04 Max Steps             ✅
05 Loop State            ← 当前
06 Minimal Agent Runtime ← 后续
```

---

## 快速测试

复用 DeepSeek 配置：

```env
MODEL_API_KEY=
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
AGENT_MAX_STEPS=4
```

### Agent Loop 01 · Manual Two-Step

```bash
npm run agent-loop:01 -- "请使用可用工具计算 123 + 456"
```

```text
LLM #1 → Tool → LLM #2 → STOP
```

详细说明：[`01-manual-two-step/README.md`](./01-manual-two-step/README.md)

### Agent Loop 02 · Basic Loop

```bash
npm run agent-loop:02
```

```text
while (true)
↓
Tool Call → continue
Final Answer → break
```

详细说明：[`02-basic-loop/README.md`](./02-basic-loop/README.md)

### Agent Loop 03 · Stop Condition

```bash
npm run agent-loop:03
```

重点看：

```text
CONTINUE · tool_call
DONE     · final_answer
```

详细说明：[`03-stop-condition/README.md`](./03-stop-condition/README.md)

### Agent Loop 04 · Max Steps

```bash
npm run agent-loop:04
```

重点观察：

```text
status = done
reason = final_answer
```

或者：

```text
status = stopped
reason = max_steps
```

详细说明：[`04-max-steps/README.md`](./04-max-steps/README.md)

### Agent Loop 05 · Loop State

```bash
npm run agent-loop:05
```

重点观察：

```text
[Loop State · initial]
[Loop State · after tool]
[Loop State · done]
```

看同一个 State 如何持续变化：

```text
step
maxSteps
messages
result
```

详细说明：[`05-loop-state/README.md`](./05-loop-state/README.md)

---

# Agent Loop 01 · Manual Two-Step

核心问题：**为什么已经有 LLM → Tool → LLM，却还不能叫 Agent Loop？**

因为：

```text
LLM 调用次数   = 固定
Tool 执行次数  = 固定
结束位置       = 固定
```

程序提前规定：

```text
LLM #1 → Tool → LLM #2 → STOP
```

所以：

```text
01 = Fixed Flow
```

---

# Agent Loop 02 · Basic Loop

核心问题：**怎么让执行次数不再提前写死？**

第一次引入：

```ts
while (true) {
  const response = await callLLM(messages)

  if (有 Tool Call) {
    executeTool()
    continue
  }

  break
}
```

所以：

```text
02 = Loop
```

---

# Agent Loop 03 · Stop Condition

核心问题：**什么时候应该继续，什么时候才算真正完成？**

正式表达为：

```text
CONTINUE · tool_call
DONE     · final_answer
```

通过：

```ts
decideNextStep(response.message)
```

把“解释模型响应”从主循环中分离。

同时明确：

```text
没有 tool_calls
≠
一定完成
```

只有：

```text
没有 tool_calls
+
有 final assistant content
```

才是：

```text
DONE · final_answer
```

所以：

```text
03 = Decision
```

---

# Agent Loop 04 · Max Steps

核心问题：**如果模型一直 CONTINUE，Agent 怎么防止无限运行？**

正式定义：

```text
maxSteps
= 最多允许多少次 LLM 决策
```

正常结束：

```text
final_answer
↓
status = done
```

保护性停止：

```text
step 到 maxSteps
+
模型仍想继续
↓
status = stopped
reason = max_steps
```

所以：

```text
04 = Runtime Boundary
```

模型决定：

```text
我还想不想继续？
```

Runtime 决定：

```text
你最多能继续多久？
```

---

# Agent Loop 05 · Loop State

核心问题：**Agent 运行过程中，step / messages / maxSteps / result 应该统一放在哪里？**

`04` 里这些数据还是散落的：

```text
step
maxSteps
messages
result
```

`05` 第一次定义：

```ts
type LoopState = {
  step: number
  maxSteps: number
  messages: Array<Record<string, unknown>>
  result?: AgentRunResult
}
```

结构变成：

```text
LoopState
├── step
├── maxSteps
├── messages
└── result
```

## Runtime Logic vs Runtime State

这一节最重要的边界：

```text
Runtime Logic
= 下一步做什么
```

例如：

```text
call LLM
decideNextStep
execute Tool
检查 maxSteps
```

而：

```text
Runtime State
= 当前已经发生了什么
```

例如：

```text
state.step
state.maxSteps
state.messages
state.result
```

可以记成：

> **Logic 决定下一步；State 记录当前状态。**

## 行为没有变化

这一轮没有增加新的 Agent 能力。

`04`：

```ts
step += 1
messages.push(...)
result = ...
```

`05`：

```ts
state.step += 1
state.messages.push(...)
state.result = ...
```

仍然是同一条运行链：

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

变化只是：

```text
散落的运行变量
↓
一个明确的 LoopState
```

所以：

```text
05 = Runtime State
```

详细实现：

```text
05-loop-state/
├── state.ts
├── index.ts
└── README.md
```

---

## 下一步为什么是 Minimal Agent Runtime？

现在已经分别拥有：

```text
Tool abstraction
Loop
Decision
maxSteps
LoopState
```

但主程序仍然自己负责：

```text
创建 State
调用 LLM
进入循环
执行 Tool
更新 State
生成 Result
```

下一轮进入：

```text
agent-loop:06 · Minimal Agent Runtime
```

把这一整段运行过程第一次收成类似：

```ts
const result = await runAgent({
  prompt,
  tools,
  maxSteps,
})
```

也就是：

```text
04 = Runtime Boundary
05 = Runtime State
06 = Runtime Encapsulation
```

---

## 当前 Done 标准

### Agent Loop 01

- [ ] 我知道固定两步为什么还不是 Agent Loop。

### Agent Loop 02

- [ ] 我能解释 `while / continue / break`。
- [ ] 我知道执行轮数不再提前固定。

### Agent Loop 03

- [ ] 我能解释 `CONTINUE / DONE`。
- [ ] 我知道 `final_answer` 是正常停止条件。

### Agent Loop 04

- [ ] 我能解释 `maxSteps`。
- [ ] 我能区分 `final_answer / max_steps`。
- [ ] 我知道 Runtime 必须有自己的硬边界。

### Agent Loop 05

- [ ] 我能解释 `LoopState`。
- [ ] 我知道为什么 `step / maxSteps / messages / result` 属于 State。
- [ ] 我能区分 Runtime Logic 和 Runtime State。
- [ ] 我能看懂同一个 State 如何跨多轮持续更新。
- [ ] 我知道这一轮没有增加新的 Agent 行为。
- [ ] 我知道为什么下一步可以开始封装 `runAgent()`。

做到这些，就进入 **agent-loop:06 · Minimal Agent Runtime**。
