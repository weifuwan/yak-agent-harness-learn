# 03 · Agent Loop 学习

> 核心问题：**谁负责让 LLM → Tool → LLM 持续运行，又什么时候停止？**

当前原则：**每次只增加一个问题和一个能力。**

当前状态：`COMPLETE`

---

## 学习路线

```text
01 Manual Two-Step       ✅
   ↓
02 Basic Loop            ✅
   ↓
03 Stop Condition        ✅
   ↓
04 Max Steps             ✅
   ↓
05 Loop State            ✅
   ↓
06 Minimal Agent Runtime ✅
```

这 6 轮最终长成：

```ts
const result = await runAgent({
  prompt,
  tools,
  maxSteps,
})
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

### 01 · Manual Two-Step

```bash
npm run agent-loop:01
```

```text
LLM #1 → Tool → LLM #2 → STOP
```

重点：调用次数还是代码写死的。

详细说明：[`01-manual-two-step/README.md`](./01-manual-two-step/README.md)

### 02 · Basic Loop

```bash
npm run agent-loop:02
```

```text
while
↓
Tool Call → continue
Final Answer → break
```

重点：执行轮数不再提前固定。

详细说明：[`02-basic-loop/README.md`](./02-basic-loop/README.md)

### 03 · Stop Condition

```bash
npm run agent-loop:03
```

```text
CONTINUE · tool_call
DONE     · final_answer
```

重点：把“为什么继续 / 为什么结束”正式表达出来。

详细说明：[`03-stop-condition/README.md`](./03-stop-condition/README.md)

### 04 · Max Steps

```bash
npm run agent-loop:04
```

```text
final_answer → done
max_steps    → stopped
```

重点：模型决定“还想不想继续”，Runtime 决定“最多能继续多久”。

详细说明：[`04-max-steps/README.md`](./04-max-steps/README.md)

### 05 · Loop State

```bash
npm run agent-loop:05
```

```text
LoopState
├── step
├── maxSteps
├── messages
└── result
```

重点：Logic 决定下一步，State 记录已经发生了什么。

详细说明：[`05-loop-state/README.md`](./05-loop-state/README.md)

### 06 · Minimal Agent Runtime

```bash
npm run agent-loop:06
```

外部现在只需要：

```ts
const result = await runAgent({
  prompt,
  tools,
  maxSteps,
})
```

调用者不再操作：

```text
while
messages
tool_call_id
Tool Result
LoopState
Stop Condition
```

这些全部进入 Runtime 内部。

详细说明：[`06-minimal-agent-runtime/README.md`](./06-minimal-agent-runtime/README.md)

---

# 01 · Fixed Flow

最初只有：

```text
LLM #1
↓
Tool
↓
LLM #2
↓
STOP
```

问题：

```text
LLM 调用次数   = 固定
Tool 执行次数  = 固定
结束位置       = 固定
```

所以还不是 Agent Loop。

---

# 02 · Loop

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

从：

```text
程序提前决定执行几轮
```

变成：

```text
模型当前是否还需要 Tool
决定是否进入下一轮
```

---

# 03 · Decision

把隐含判断正式抽成：

```text
LLM Response
↓
decideNextStep()
├── CONTINUE · tool_call
└── DONE · final_answer
```

并明确：

```text
没有 tool_calls
≠
一定完成
```

必须有有效 final assistant content，才是正常完成。

---

# 04 · Runtime Boundary

如果模型一直：

```text
CONTINUE
↓
CONTINUE
↓
CONTINUE
```

Runtime 必须有自己的硬边界：

```text
maxSteps
= 最多允许多少次 LLM 决策
```

结果分成：

```text
done
reason = final_answer
```

和：

```text
stopped
reason = max_steps
```

---

# 05 · Runtime State

把散落的：

```text
step
maxSteps
messages
result
```

收进：

```ts
type LoopState = {
  step: number
  maxSteps: number
  messages: Array<Record<string, unknown>>
  result?: AgentRunResult
}
```

边界变成：

```text
Runtime Logic
= 下一步做什么

Runtime State
= 当前已经发生了什么
```

---

# 06 · Runtime Encapsulation

最后把整个执行过程收进：

```ts
runAgent(options)
```

结构变成：

```text
Application
↓
runAgent({ prompt, tools, maxSteps })
↓
┌────────────────────────┐
│ Minimal Agent Runtime  │
│                        │
│ create LoopState       │
│ ↓                      │
│ LLM                    │
│ ↓                      │
│ Decision               │
│ ↓                      │
│ Tool Execution         │
│ ↓                      │
│ update LoopState       │
│ ↓                      │
│ continue / stop        │
└────────────────────────┘
↓
AgentRunResult
```

目录：

```text
06-minimal-agent-runtime/
├── types.ts
├── runtime.ts
├── index.ts
└── README.md
```

职责：

```text
index.ts
= Runtime 使用者

types.ts
= 输入 / State / Result 契约

runtime.ts
= Runtime 实现
```

一句话：

> **05 把运行数据收进 State，06 把运行过程收进 Runtime。**

---

## Agent Loop 最终心智模型

```text
User Prompt
↓
Agent Runtime
↓
LLM
↓
Decision
├── final_answer
│      ↓
│     DONE
│
└── tool_call
       ↓
    maxSteps?
    ├── exhausted → STOPPED
    └── available
           ↓
       Execute Tool
           ↓
       Observation
           ↓
       update messages
           ↓
       next LLM step
```

所以：

> **Tool 解决“模型怎么做事”，Agent Loop 解决“模型怎么持续做事，直到完成或触碰 Runtime 边界”。**

---

## 当前故意没有做

```text
Session
Context Manager
Compaction
Permission
Retry / Recovery
Event Bus
Middleware
Telemetry
```

这些问题分别留给后续阶段。

---

## Agent Loop 封板标准

- [ ] 我知道固定两步为什么不是 Agent Loop。
- [ ] 我能解释 `while / continue / break`。
- [ ] 我能解释 `CONTINUE / DONE`。
- [ ] 我知道 `final_answer` 是正常完成。
- [ ] 我知道为什么需要 `maxSteps`。
- [ ] 我能区分 `done / stopped`。
- [ ] 我能解释 `LoopState`。
- [ ] 我能区分 Runtime Logic 和 Runtime State。
- [ ] 我知道 `runAgent()` 为什么应该隐藏 while / messages / Tool Result 等细节。
- [ ] 我能从 01 一直画到 06，并解释每个抽象是被哪个问题逼出来的。

做到这些，`03 · Agent Loop` 封板。

下一阶段：

```text
04 · Session
```

新的核心问题：

> **一次 runAgent() 结束以后，这次运行历史怎么保存？下一次用户继续说话时，怎么接着上一次对话？**
