# Integration 06 · Minimal Coding Agent Runtime

> 核心问题：**前面已经把所有能力组合起来以后，调用方还需要知道多少内部细节？**

运行：

```bash
npm run integration:06
```

---

## 05 的问题

`integration:05` 已经拥有完整主链：

```text
Session
↓
Context
↓
Compaction
↓
Coding Loop
↓
Permission
↓
Recovery
```

但调用方仍然需要自己创建：

```text
readTool
writeTool
runTestTool
PermissionRuntime
SessionStore
CodingAgent
ContinuityAgent
```

功能已经完整，边界还没有收口。

---

## 06 · Runtime

这一轮不再增加新能力，只做最后一次封装：

```ts
const agent = createMiniCodingAgentRuntime({
  llm,
  workspaceRoot,
  snapshotFiles,
  compaction,
})

const result = await agent.run({
  sessionId,
  prompt,
})
```

调用方不再自己编排内部模块。

Runtime 内部负责创建：

```text
Workspace Tools
├── read_file
├── write_file
└── run_test

Permission Runtime
Session Store
Coding Loop
Continuity Agent
Context / Compaction
Checkpoint / Rollback
```

---

## 为什么 approval / recovery 还暴露？

隐藏实现细节，不等于替用户做决定。

所以公开 API 仍然保留：

```text
run()
resumeApproval()
resumeRecovery()
rollback()
getSession()
```

其中：

```text
approval
= 外部授权决定

recovery
= 外部恢复策略决定
```

Runtime 负责执行机制，但不偷走人的控制权。

---

## 最终结构

```text
MiniCodingAgentRuntime
│
├── LLM Provider
├── Tool Registry
│   ├── read_file
│   ├── write_file
│   └── run_test
├── Permission Runtime
├── Session Store
├── Context Runtime
├── Compaction Runtime
├── Coding Loop
└── Recovery / Checkpoint
```

调用方只看统一入口。

---

## 默认 Demo

### Run 1

```text
“把 config.ts 的 port 从 3000 改成 8080，并运行测试确认通过。”
```

Runtime 内部完成：

```text
read
write + permission
test
final answer
Session commit
```

### Run 2

```text
“刚才那个文件里的 port 当前是多少？”
```

继续使用同一个 `sessionId`：

```text
Session
↓
Context
↓
理解“刚才那个”
↓
read_file
↓
answer
```

调用方没有重新组装任何 Runtime。

---

## 当前明确不做

```text
任意 shell
Git Runtime
Sub Agent
MCP
进程级持久化 Runtime
分布式任务恢复
真正产品级事务 / Saga
```

这些属于后续工程规模问题，不是当前 Mini Coding Agent 的最小闭环。

---

## Integration 六轮

```text
01 = Skeleton
02 = Inspect
03 = Edit
04 = Loop
05 = Continuity
06 = Runtime
```

最重要的一句话：

> **Runtime 的价值不是增加能力，而是把已经理解的能力装配成一个稳定、可复用、对调用方简单的边界。**

---

## Done 标准

- [ ] 我知道 Runtime 不是新的 Agent 能力，而是能力装配边界。
- [ ] 我知道调用方不应该自己创建所有 Tool / Permission / Session / Loop。
- [ ] 我知道 `agent.run()` 背后仍然经过 Context、Permission、Recovery 等模块。
- [ ] 我知道 approval / recovery 为什么仍然必须显式暴露。
- [ ] 我知道 workspaceRoot 同时约束读写、Permission 和 Snapshot。
- [ ] 我能解释 `01 = Skeleton` 到 `06 = Runtime` 的完整演进。

做到这些，**Integration · Mini Coding Agent COMPLETE**。
