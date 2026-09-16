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
03 Stop Condition        ← 当前
04 Max Steps             ← 后续
05 Loop State            ← 后续
06 Minimal Agent Runtime ← 后续
```

---

## 快速测试

复用 DeepSeek 配置：

```env
MODEL_API_KEY=
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
```

### Agent Loop 01 · Manual Two-Step

```bash
npm run agent-loop:01 -- "请使用可用工具计算 123 + 456"
```

```text
LLM #1
↓
Tool
↓
LLM #2
↓
STOP
```

详细说明：[`01-manual-two-step/README.md`](./01-manual-two-step/README.md)

### Agent Loop 02 · Basic Loop

```bash
npm run agent-loop:02
```

第一次真正使用：

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

重点观察：

```text
[Decision] type=continue, reason=tool_call
```

以及最终：

```text
[Decision] type=done, reason=final_answer
```

详细说明：[`03-stop-condition/README.md`](./03-stop-condition/README.md)

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

所以这只是固定流程。

---

# Agent Loop 02 · Basic Loop

核心问题：**怎么让执行次数不再提前写死？**

这一轮第一次引入：

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

变化是：

```text
01
程序决定调用几次

02
模型是否继续产生 Tool Call，决定流程是否继续
```

但当前停止判断仍然很粗糙：

```text
有 tool_calls
→ continue

没有 tool_calls
→ break
```

---

# Agent Loop 03 · Stop Condition

核心问题：**什么时候应该继续，什么时候才算真正完成？**

这一轮第一次定义：

```ts
type LoopDecision =
  | {
      type: "continue"
      reason: "tool_call"
      toolCall: ToolCall
    }
  | {
      type: "done"
      reason: "final_answer"
      content: string
    }
```

然后把判断从主循环里抽出来：

```ts
const decision = decideNextStep(response.message)
```

结构变成：

```text
LLM Response
↓
decideNextStep()
↓
LoopDecision
├── CONTINUE · tool_call
└── DONE · final_answer
↓
主循环执行决定
```

## CONTINUE

当模型返回一个 Tool Call：

```text
message.tool_calls.length = 1
```

得到：

```text
CONTINUE
reason = tool_call
```

程序执行 Tool，把 Tool Result 写回 messages，然后进入下一轮。

## DONE

当模型：

```text
没有 tool_calls
+
有最终 assistant content
```

得到：

```text
DONE
reason = final_answer
```

程序输出最终答案并 `break`。

## 一个重要修正

现在不再认为：

```text
没有 tool_calls
= 一定完成
```

如果模型既没有 Tool Call，也没有最终文本：

```text
no tool_calls
+
empty content
```

程序直接报错。

因为：

> **停止条件应该描述“为什么完成”，而不是只描述“为什么没有继续”。**

所以可以记成：

```text
02 = Loop
03 = Decision
```

---

## 为什么下一步是 Max Steps？

现在正常情况已经定义清楚：

```text
tool_call
→ CONTINUE

final_answer
→ DONE
```

但如果模型一直返回：

```text
CONTINUE
↓
CONTINUE
↓
CONTINUE
↓
...
```

正常 Stop Condition 永远不会触发。

当前代码里的 `DEMO_CIRCUIT_BREAKER = 12` 只是防止学习代码真实调用 API 时失控，不是正式设计。

下一轮进入：

```text
agent-loop:04 · Max Steps
```

正式解决：

> **Agent 最多允许运行多少步？超过以后应该怎么停止？**

---

## 当前 Done 标准

### Agent Loop 01

- [ ] 我知道固定两步为什么还不是 Agent Loop。

### Agent Loop 02

- [ ] 我能解释 `while / continue / break`。
- [ ] 我知道执行轮数已经不再提前固定。

### Agent Loop 03

- [ ] 我能解释 `LoopDecision`。
- [ ] 我能区分 `CONTINUE / DONE`。
- [ ] 我知道 `tool_call` 为什么对应 CONTINUE。
- [ ] 我知道 `final_answer` 为什么对应 DONE。
- [ ] 我能看懂 `decideNextStep()`。
- [ ] 我知道“没有 tool_calls”本身不等于有效完成。
- [ ] 我知道为什么下一步需要 Max Steps。

做到这些，就进入 **agent-loop:04 · Max Steps**。
