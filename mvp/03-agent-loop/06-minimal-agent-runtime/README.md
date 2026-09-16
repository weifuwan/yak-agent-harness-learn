# Agent Loop 06 · Minimal Agent Runtime

> 核心问题：**前面已经有 Loop / Decision / maxSteps / LoopState，怎么把整条运行过程收成一个真正可调用的 Runtime？**

这一轮不增加新的 Agent 能力。

只做一件事：

```text
把“怎么运行 Agent”封装起来
```

---

## 05 之前的问题

`agent-loop:05` 已经有明确的 `LoopState`：

```text
step
maxSteps
messages
result
```

但调用方仍然自己负责：

```text
创建 State
↓
while
↓
调用 LLM
↓
Decision
↓
执行 Tool
↓
写回 Tool Result
↓
更新 State
↓
停止
```

也就是说：

```text
调用者
=
Runtime 使用者 + Runtime 实现者
```

---

## 06 的变化

现在外部只需要：

```ts
const result = await runAgent({
  prompt,
  tools,
  maxSteps,
})
```

返回：

```ts
AgentRunResult
```

调用者不再知道内部：

```text
while 怎么跑
messages 怎么增长
Tool Call 怎么执行
Tool Result 怎么写回
LoopState 怎么更新
什么时候 final_answer
什么时候 max_steps
```

这些全部进入：

```text
runtime.ts
```

---

## 目录

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
= Agent Runtime 实现
```

---

## Runtime 内部

`runAgent()` 内部仍然是前面已经学过的东西：

```text
RunAgentOptions
↓
create LoopState
↓
LLM
↓
decideNextStep
├── final_answer → DONE
└── tool_call
      ↓
   maxSteps?
   ├── YES → STOPPED
   └── NO
        ↓
     execute Tool
        ↓
     Tool Result → messages
        ↓
     next loop
↓
AgentRunResult
```

所以 06 不是突然出现的新魔法。

只是把 01～05 已经验证过的东西收起来。

---

## 运行

```bash
npm run agent-loop:06
```

也可以传自己的 Prompt：

```bash
npm run agent-loop:06 -- "请读取 package.json，然后告诉我项目名称"
```

配置仍然使用：

```env
MODEL_API_KEY=
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
AGENT_MAX_STEPS=4
```

---

## 这一轮最重要的边界

```text
Agent Runtime 使用者
↓
runAgent(options)
↓
Agent Runtime
↓
AgentRunResult
```

使用者只关心：

```text
输入什么？
给哪些 Tools？
最多跑多少步？
最后结果是什么？
```

Runtime 才关心：

```text
LoopState
messages
Tool Call
Tool Result
Decision
maxSteps
```

一句话：

> **05 把运行数据收进 State，06 把运行过程收进 Runtime。**

---

## 当前仍然故意不做

这一轮没有加入：

```text
Session
Context Manager
Compaction
Permission
Retry
Recovery
Event Bus
Middleware
Telemetry
```

因为这些问题还没有轮到。

当前 Runtime 只解决：

> **给我 Prompt + Tools + maxSteps，我完成一次 Agent Run。**

---

## Done 标准

- [ ] 我能解释为什么 `index.ts` 不应该知道 `while`。
- [ ] 我知道 `runAgent()` 是 Runtime 的最小入口。
- [ ] 我能区分 Runtime 使用者和 Runtime 实现。
- [ ] 我知道 LoopState 仍然存在，只是变成 Runtime 内部状态。
- [ ] 我能解释 `RunAgentOptions → AgentRunResult`。
- [ ] 我知道 06 没有增加新的 Agent 行为，只做封装。
- [ ] 我能说出 01～06 是怎么一步步长成 `runAgent()` 的。

做到这些，`03 · Agent Loop` 可以封板，下一阶段进入 **04 · Session**。
