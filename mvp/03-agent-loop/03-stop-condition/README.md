# Agent Loop 03 · Stop Condition

核心问题：**Agent Loop 到底什么时候应该继续，什么时候才算真正完成？**

`agent-loop:02` 已经有了真正的 `while (true)`：

```text
有 tool_calls
→ continue

没有 tool_calls
→ break
```

这能跑，但停止判断还写在主循环里，而且过于隐含。

这一节只做一件事：

> **把 continue / done 的判断正式抽出来。**

---

## 新的 LoopDecision

代码里定义：

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

现在先只认识两种正常状态：

```text
CONTINUE
reason = tool_call

DONE
reason = final_answer
```

暂时不要加入：

```text
max_steps ❌
abort     ❌
timeout   ❌
failed    ❌
retry     ❌
```

这些以后再遇到问题时增加。

---

## decideNextStep()

真正的新函数是：

```ts
function decideNextStep(message: AssistantMessage): LoopDecision {
  ...
}
```

它负责解释模型响应。

### 情况 1：模型产生一个 Tool Call

```text
message.tool_calls.length = 1
```

返回：

```text
CONTINUE
reason = tool_call
```

主循环接下来执行 Tool，然后进入下一轮。

### 情况 2：模型没有 Tool Call，但有最终文本

```text
tool_calls = []
content = "最终答案..."
```

返回：

```text
DONE
reason = final_answer
```

主循环输出最终答案，然后 `break`。

### 情况 3：既没有 Tool Call，也没有最终文本

这次不会直接当作 DONE。

而是：

```text
ERROR
```

因为：

> **“没有 Tool Call”只能说明模型没有请求工具，不代表一定产生了一个有效的最终回答。**

这是这一轮很重要的边界。

---

## 主循环发生了什么变化？

### agent-loop:02

主循环自己读字段：

```ts
const toolCalls = response.message.tool_calls ?? []

if (toolCalls.length === 0) {
  break
}
```

也就是：

```text
运行逻辑
+
停止判断

混在一起
```

### agent-loop:03

现在变成：

```ts
const decision = decideNextStep(response.message)

if (decision.type === "done") {
  break
}

// continue → execute tool
```

也就是：

```text
LLM Response
↓
decideNextStep()
↓
LoopDecision
├── CONTINUE
└── DONE
↓
主循环执行决定
```

所以第一次把：

```text
解释模型响应
```

和：

```text
执行循环
```

分开了。

---

## 运行

继续使用前面的 DeepSeek 配置：

```env
MODEL_API_KEY=
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
```

运行默认多步例子：

```bash
npm run agent-loop:03
```

默认任务：

```text
先读取 package.json 找到项目名称
↓
再获取当前服务器时间
↓
最后给出项目名称和当前时间
```

也可以自己传：

```bash
npm run agent-loop:03 -- "请读取 package.json，并告诉我项目名称"
```

重点观察输出：

```text
[Decision] type=continue, reason=tool_call
```

以及最终：

```text
[Decision] type=done, reason=final_answer
```

---

## 一个典型流程

```text
Loop Step 1
↓
LLM
↓
read_file
↓
decideNextStep()
↓
CONTINUE · tool_call
↓
execute read_file
↓
Tool Result

Loop Step 2
↓
LLM
↓
get_current_time
↓
decideNextStep()
↓
CONTINUE · tool_call
↓
execute get_current_time
↓
Tool Result

Loop Step 3
↓
LLM
↓
最终文本
↓
decideNextStep()
↓
DONE · final_answer
↓
break
```

现在循环的停止原因已经变成一个明确概念，而不是散落在 `if` 里。

---

## 02 和 03 的区别

```text
agent-loop:02
= 让循环跑起来

agent-loop:03
= 明确循环为什么继续、为什么结束
```

可以记成：

```text
02 = Loop
03 = Decision
```

---

## 为什么 03 还不解决无限循环？

因为当前只定义了“正常完成”的规则：

```text
tool_call
→ CONTINUE

final_answer
→ DONE
```

但如果模型一直：

```text
tool_call
↓
tool_call
↓
tool_call
↓
...
```

它永远不会产生 `DONE`。

代码里仍然保留一个 `DEMO_CIRCUIT_BREAKER = 12`，只是为了真实 API 演示不会失控。

它现在不是正式的 Agent 设计。

下一轮才正式解决：

> **如果模型一直 CONTINUE，最多允许跑多少步？**

也就是 `agent-loop:04 · Max Steps`。

---

## 当前 Done 标准

- [ ] 我能解释为什么“没有 tool_calls”不一定等于有效完成。
- [ ] 我能解释 `LoopDecision` 是什么。
- [ ] 我能区分 `CONTINUE / DONE`。
- [ ] 我知道 `tool_call` 为什么对应 CONTINUE。
- [ ] 我知道 `final_answer` 为什么对应 DONE。
- [ ] 我能看懂 `decideNextStep()`。
- [ ] 我知道主循环现在只负责执行 Decision。
- [ ] 我知道 `DEMO_CIRCUIT_BREAKER` 不是这一轮正式的 Stop Condition。
- [ ] 我知道下一步为什么需要 Max Steps。

做到这些，就进入 **agent-loop:04 · Max Steps**。
