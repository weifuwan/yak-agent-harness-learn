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
02 Basic Loop            ← 当前
03 Stop Condition        ← 后续
04 Max Steps             ← 后续
05 Loop State            ← 后续
06 Minimal Agent Runtime ← 后续
```

---

## 快速测试

复用前面已经配置好的 DeepSeek：

```env
MODEL_API_KEY=
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
```

### Agent Loop 01 · Manual Two-Step

```bash
npm run agent-loop:01 -- "请使用可用工具计算 123 + 456"
```

固定流程：

```text
LLM #1
↓
最多一次 Tool
↓
LLM #2
↓
STOP
```

独立说明：[`01-manual-two-step/README.md`](./01-manual-two-step/README.md)

### Agent Loop 02 · Basic Loop

推荐先直接跑默认多步场景：

```bash
npm run agent-loop:02
```

也可以：

```bash
npm run agent-loop:02 -- "请读取 package.json，然后告诉我项目名称"
```

重点观察：

```text
Loop Step 1
↓
Tool Call
↓
Tool Result
↓
continue
↓
Loop Step 2
↓
...
↓
没有 Tool Call
↓
break
```

独立说明：[`02-basic-loop/README.md`](./02-basic-loop/README.md)

---

# Agent Loop 01 · Manual Two-Step

核心问题：**为什么已经有 LLM → Tool → LLM，却还不能叫 Agent Loop？**

因为流程仍然是写死的：

```ts
const first = await callLLM()

executeTool()

const second = await callLLM()

return second
```

也就是：

```text
LLM 调用次数   = 固定
Tool 执行次数  = 固定
结束位置       = 固定
```

第二次调用故意使用：

```text
tool_choice = none
```

程序提前规定第二次必须结束。

所以它只是：

```text
固定两步流程
```

还不是自动循环。

详细说明：[`01-manual-two-step/README.md`](./01-manual-two-step/README.md)

---

# Agent Loop 02 · Basic Loop

核心问题：**怎么让流程根据模型状态自动继续，而不是提前写死调用次数？**

这一轮第一次出现：

```ts
while (true) {
  const response = await callLLM(messages)

  if (response 有 Tool Call) {
    executeTool()
    continue
  }

  break
}
```

结构变成：

```text
              ┌─────────────────────┐
              │                     │
              ↓                     │
             LLM                    │
              ↓                     │
         有 Tool Call？              │
          ├── YES                    │
          │    ↓                    │
          │  Execute Tool           │
          │    ↓                    │
          │  Tool Result            │
          │    ↓                    │
          │  写入 messages          │
          │    ↓                    │
          └── continue ─────────────┘

          └── NO
               ↓
          Final Assistant
               ↓
              break
```

## 01 和 02 的本质区别

```text
agent-loop:01
程序决定调用几次

agent-loop:02
模型是否继续产生 Tool Call，决定流程是否继续
```

所以现在：

```text
LLM 调用多少次
Tool 执行多少次
```

都不再提前固定。

## messages 会不断增长

开始：

```text
system
user
```

执行一次 Tool 后：

```text
system
user
assistant(tool_calls #1)
tool(result #1)
```

再执行一个 Tool 后：

```text
system
user
assistant(tool_calls #1)
tool(result #1)
assistant(tool_calls #2)
tool(result #2)
```

下一轮模型始终会重新看到完整过程。

这其实已经开始形成：

```text
Model
↓
Action
↓
Execute
↓
Observation
↓
Model
```

## 当前停止判断还很粗糙

这一节暂时只写：

```text
有 tool_calls
→ continue

没有 tool_calls
→ break
```

但还没有认真处理：

```text
finish_reason
空 content
异常结束
Tool 失败
```

所以 Stop Condition 还没有真正设计。

## DEMO_CIRCUIT_BREAKER

代码里有一个演示保险丝，避免真实 `while (true)` 在异常情况下持续调用付费 API。

它只是学习代码的保护措施。

真正的 `maxSteps` 会在 `agent-loop:04` 正式学习。

详细说明：[`02-basic-loop/README.md`](./02-basic-loop/README.md)

---

## 下一步为什么是 Stop Condition？

现在已经会循环了：

```text
Tool Call
→ continue

没有 Tool Call
→ break
```

但新的问题也出现了：

> **“没有 Tool Call”真的就一定代表任务完成吗？**

比如：

```text
finish_reason 是什么？
模型 content 为空怎么办？
请求异常怎么办？
Tool 执行失败怎么办？
```

所以接下来进入：

```text
agent-loop:03 · Stop Condition
```

把“什么时候继续、什么时候结束”单独拿出来学习。

---

## 当前 Done 标准

### Agent Loop 01

- [ ] 我能画出 `LLM #1 → Tool → LLM #2 → STOP`。
- [ ] 我知道为什么固定两步还不是 Agent Loop。
- [ ] 我知道当前调用次数是程序提前写死的。

### Agent Loop 02

- [ ] 我能解释为什么需要 `while`。
- [ ] 我知道有 Tool Call 时为什么 `continue`。
- [ ] 我知道没有 Tool Call 时为什么暂时 `break`。
- [ ] 我能看懂 Tool Result 如何追加到 messages。
- [ ] 我知道下一轮 LLM 会重新读取完整 messages。
- [ ] 我知道 LLM / Tool 的执行轮数已经不再提前固定。
- [ ] 我知道当前 Stop Condition 还非常粗糙。
- [ ] 我知道演示保险丝和正式 maxSteps 不是一回事。

做到这些，就进入 **agent-loop:03 · Stop Condition**。
