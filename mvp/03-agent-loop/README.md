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
04 Max Steps             ← 当前
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

默认：

```env
AGENT_MAX_STEPS=4
```

运行：

```bash
npm run agent-loop:04
```

重点观察两种结果：

```text
status = done
reason = final_answer
```

或者：

```text
status = stopped
reason = max_steps
```

想更容易看到保护性停止，可以把 `.env` 改成：

```env
AGENT_MAX_STEPS=2
```

详细说明：[`04-max-steps/README.md`](./04-max-steps/README.md)

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

可以记成：

```text
01 = Fixed Flow
02 = Loop
```

---

# Agent Loop 03 · Stop Condition

核心问题：**什么时候应该继续，什么时候才算真正完成？**

把判断正式表达成：

```text
CONTINUE · tool_call
DONE     · final_answer
```

主循环不再自己解释模型响应，而是通过：

```ts
decideNextStep(response.message)
```

得到明确的 `LoopDecision`。

同时修正：

```text
没有 tool_calls
≠
一定完成
```

只有：

```text
没有 tool_calls
+
有最终 assistant content
```

才是：

```text
DONE · final_answer
```

可以记成：

```text
02 = Loop
03 = Decision
```

---

# Agent Loop 04 · Max Steps

核心问题：**如果模型一直 CONTINUE，Agent 怎么防止无限运行？**

这一轮正式定义：

```text
maxSteps
= 最多允许多少次 LLM 决策
```

配置：

```env
AGENT_MAX_STEPS=4
```

循环现在不仅有模型自己的正常完成条件，也有 Runtime 的硬边界：

```text
模型给出 final_answer
↓
status = done
reason = final_answer
```

或者：

```text
模型仍然想继续
+
step 已经到 maxSteps
↓
status = stopped
reason = max_steps
```

## 为什么要区分 done 和 stopped？

因为：

```text
done
= 任务正常完成

stopped
= Runtime 强制结束
```

它们不是一回事。

## 最后一个 Step 还想调用 Tool 怎么办？

这一节选择：

```text
不再执行新的 Tool
↓
直接 max_steps
```

因为已经没有下一次 LLM 决策机会，不应该再额外执行一个可能有副作用的 Action。

所以可以记成：

```text
03
模型什么时候正常结束？
↓
final_answer

04
模型一直不结束怎么办？
↓
max_steps
```

或者更短：

> **03 是模型退出条件，04 是 Runtime 运行边界。**

---

## 下一步为什么是 Loop State？

现在循环里已经有越来越多运行数据：

```text
messages
step
maxSteps
decision
result
```

目前它们仍然散落在主流程的局部变量里。

下一轮进入：

```text
agent-loop:05 · Loop State
```

解决：

> **Agent 运行过程中这些状态应该怎么统一表示？**

---

## 当前 Done 标准

### Agent Loop 01

- [ ] 我知道固定两步为什么还不是 Agent Loop。

### Agent Loop 02

- [ ] 我能解释 `while / continue / break`。
- [ ] 我知道执行轮数不再提前固定。

### Agent Loop 03

- [ ] 我能解释 `CONTINUE / DONE`。
- [ ] 我能解释 `final_answer`。
- [ ] 我知道“没有 tool_calls”本身不等于完成。

### Agent Loop 04

- [ ] 我知道为什么 Agent 不能只依赖模型自己停止。
- [ ] 我能解释 `maxSteps`。
- [ ] 我知道这里一个 Step 指一次 LLM 决策。
- [ ] 我能区分 `final_answer / max_steps`。
- [ ] 我能区分 `done / stopped`。
- [ ] 我理解为什么最后一个 Step 仍要 Tool 时不再执行新 Tool。
- [ ] 我实际调小过 `AGENT_MAX_STEPS` 并观察 `max_steps`。

做到这些，就进入 **agent-loop:05 · Loop State**。
