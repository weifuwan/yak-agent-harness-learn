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
01 Manual Two-Step       ← 当前
02 Basic Loop            ← 后续
03 Stop Condition        ← 后续
04 Max Steps             ← 后续
05 Loop State            ← 后续
06 Minimal Agent Runtime ← 后续
```

---

## 快速测试

### Agent Loop 01 · Manual Two-Step

复用前面已经配置好的 DeepSeek：

```env
MODEL_API_KEY=
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
```

运行：

```bash
npm run agent-loop:01 -- "请使用可用工具计算 123 + 456"
```

默认也会测试同一个问题：

```bash
npm run agent-loop:01
```

重点观察：

```text
Step 1 · First LLM Call
↓
Step 2 · Execute One Tool
↓
Step 3 · Second LLM Call
↓
STOP
```

独立说明：[`01-manual-two-step/README.md`](./01-manual-two-step/README.md)

---

# Agent Loop 01 · Manual Two-Step

核心问题：**为什么现在已经有 LLM → Tool → LLM，却还不能叫 Agent Loop？**

Tool 阶段已经完成了：

```text
User
↓
LLM
↓
Tool Call
↓
Application
↓
Tool Result
↓
LLM
↓
Final Assistant
```

但是当前流程仍然是写死的：

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

这一轮直接复用 `tool:07` 里的 `Tool / Registry / addTool`，不重新学习 Tool。

完整固定流程：

```text
User
↓
LLM #1
↓
Tool Call
↓
Registry.get(name)
↓
Tool.execute(arguments)
↓
Tool Result
↓
加入 assistant(tool_calls)
↓
加入 tool(tool_call_id + result)
↓
LLM #2
↓
Final Assistant
↓
STOP
```

第二次调用当前故意使用：

```text
tool_choice = none
```

因为这一节就是要看清：

> **程序提前规定“第二次必须结束”。**

所以它仍然不是自动循环。

详细说明：[`01-manual-two-step/README.md`](./01-manual-two-step/README.md)

---

## 下一步为什么是 Basic Loop？

现在最大的问题已经很明确：

```text
第一次 Tool Result 之后
↓
如果模型还想调用另一个 Tool
↓
当前代码怎么办？
```

答案：

```text
处理不了
```

因为代码已经写死：

```text
第二次 LLM 调用
↓
Final Assistant
↓
STOP
```

下一轮才会第一次引入：

```ts
while (true) {
  const response = await callLLM()

  if (response 有 Tool Call) {
    executeTool()
    continue
  }

  break
}
```

也就是从：

```text
固定两步
```

变成：

```text
根据模型状态自动继续
```

---

## 当前 Done 标准

### Agent Loop 01

- [ ] 我能画出 `LLM #1 → Tool → LLM #2 → STOP`。
- [ ] 我知道为什么这还不是 Agent Loop。
- [ ] 我知道当前 LLM 调用次数是写死的。
- [ ] 我知道当前 Tool 执行次数也是写死的。
- [ ] 我知道第二次调用为什么使用 `tool_choice = none`。
- [ ] 我能解释：如果第二次还需要 Tool，当前代码为什么处理不了。
- [ ] 我知道下一步为什么需要真正的循环。

做到这些，就进入 **agent-loop:02 · Basic Loop**。
