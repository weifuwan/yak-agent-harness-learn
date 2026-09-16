# Agent Loop 04 · Max Steps

核心问题：**如果模型一直返回 CONTINUE，Agent 怎么防止无限运行？**

`agent-loop:03` 已经明确了两种正常决策：

```text
tool_call
→ CONTINUE

final_answer
→ DONE
```

但它仍然默认相信：

> 模型最终总会自己给出 `final_answer`。

真实运行里不能只靠这个假设。

---

## 如果模型一直 CONTINUE 会怎样？

例如：

```text
Step 1
→ read_file

Step 2
→ read_file

Step 3
→ get_current_time

Step 4
→ read_file

...
```

如果代码只有：

```ts
while (true) {
  ...
}
```

就可能持续：

```text
调用 LLM
执行 Tool
增加 messages
消耗 Token
产生费用
```

所以 Runtime 必须拥有自己的硬边界。

---

## 新概念：maxSteps

这一节定义：

> **maxSteps = 最多允许多少次 LLM 决策。**

默认：

```text
AGENT_MAX_STEPS=4
```

代码会打印：

```text
Loop Step 1 / 4
Loop Step 2 / 4
Loop Step 3 / 4
...
```

---

## 两种停止原因

现在停止不再只有一个 `break`。

### 1. final_answer

模型自己完成任务：

```text
LLM
↓
final_answer
↓
status = done
reason = final_answer
```

这是**正常完成**。

### 2. max_steps

模型仍然想继续，但 Runtime 不再允许：

```text
LLM
↓
tool_call
↓
已经到 maxSteps
↓
status = stopped
reason = max_steps
```

这是**保护性停止**。

---

## 为什么最后一步不再执行 Tool？

假设：

```text
maxSteps = 3
```

到：

```text
Step 3 / 3
```

模型又返回：

```text
Tool Call: read_file
```

这一节选择：

```text
不执行这个 Tool
↓
直接 max_steps
```

原因很简单：

> 如果已经没有下一次 LLM 决策机会，就不应该再额外执行一个新的 Tool Action。

尤其以后 Tool 可能是：

```text
write_file
run_command
send_message
```

它们可能有副作用。

所以运行边界要在执行新 Action 之前生效。

---

## AgentRunResult

这一节第一次明确区分运行结果：

```ts
type AgentRunResult =
  | {
      status: "done"
      reason: "final_answer"
      steps: number
      content: string
    }
  | {
      status: "stopped"
      reason: "max_steps"
      steps: number
    }
```

所以：

```text
done
≠
stopped
```

`stopped` 不代表任务完成。

---

## 运行

正常多步场景：

```bash
npm run agent-loop:04
```

默认：

```text
AGENT_MAX_STEPS=4
```

可以在 `.env` 中修改：

```env
AGENT_MAX_STEPS=2
```

这样更容易观察 `max_steps`。

例如任务可能需要：

```text
read_file
↓
get_current_time
↓
final_answer
```

如果只允许 2 次 LLM 决策，就很可能在完成前被截停。

---

## 03 和 04 的区别

```text
agent-loop:03
模型什么时候认为任务完成？
↓
final_answer

agent-loop:04
模型一直不完成怎么办？
↓
max_steps
```

可以记成：

> **03 是模型的正常退出条件，04 是 Runtime 的强制退出边界。**

---

## 当前不要继续加

```text
Timeout           ❌
Abort             ❌
Token Budget      ❌
Cost Budget       ❌
Retry             ❌
Loop State Object ❌
Runtime Class     ❌
```

这一节只解决：

> **无限 CONTINUE 的硬上限。**

---

## Done 标准

- [ ] 我能解释为什么 Agent 不能只依赖模型自己停止。
- [ ] 我能解释 `maxSteps` 的含义。
- [ ] 我知道这里的 Step 指一次 LLM 决策。
- [ ] 我能区分 `final_answer` 和 `max_steps`。
- [ ] 我知道 `done` 和 `stopped` 不是一回事。
- [ ] 我理解为什么最后一个 Step 仍要 Tool 时，不再执行这个 Tool。
- [ ] 我实际把 `AGENT_MAX_STEPS` 调小并观察过 `max_steps`。

做到这些，就进入 **agent-loop:05 · Loop State**。
