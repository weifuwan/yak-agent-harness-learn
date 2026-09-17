# Integration · Mini Coding Agent

> 核心问题：**前面 8 个能力都单独理解以后，怎么一步步把它们组合成一个真正能工作的 Coding Agent？**

当前状态：`LEARNING`

Integration 仍然沿用同一个原则：

```text
理解一个组合问题
↓
只接必要模块
↓
验证边界
↓
封板
↓
再接下一层
```

---

## 学习路线

```text
01 Agent Skeleton
   ↓
02 Read → Think → Answer
   ↓
03 Read → Edit → Permission → Write
   ↓
04 Multi-Step Coding Loop
   ↓
05 Session / Context / Recovery
   ↓
06 Minimal Coding Agent Runtime
```

当前进度：

```text
01 Agent Skeleton                    ✅
02 Read → Think → Answer             ✅
03 Read → Edit → Permission → Write  ✅
04 Multi-Step Coding Loop            ← 当前
05 Session / Context / Recovery      ← 后续
06 Minimal Coding Agent Runtime      ← 后续
```

---

# 01 · Agent Skeleton

```bash
npm run integration:01
```

```text
User Prompt
↓
MiniCodingAgent
↓
Context Runtime
↓
LLM Provider
↓
Answer
```

```text
01 = Skeleton
```

详细：[`01-agent-skeleton/README.md`](./01-agent-skeleton/README.md)

---

# 02 · Read → Think → Answer

```bash
npm run integration:02
```

第一次让 Agent 主动读取真实项目文件：

```text
LLM
↓
read_file
↓
Tool Result
↓
LLM
↓
Answer
```

```text
02 = Inspect
```

详细：[`02-read-think-answer/README.md`](./02-read-think-answer/README.md)

---

# 03 · Read → Edit → Permission → Write

```bash
npm run integration:03
```

第一次安全地产生文件副作用：

```text
read_file
↓
LLM
↓
write_file Tool Call
↓
Permission Runtime
↓
approve / reject
↓
真正写入 / 不写入
```

关键边界：

```text
Tool Call
≠
Tool Execution
```

```text
03 = Edit
```

详细：[`03-read-edit-permission-write/README.md`](./03-read-edit-permission-write/README.md)

---

# 04 · Multi-Step Coding Loop

核心问题：

> **为什么真实 Coding Agent 的下一步不能继续由 Runtime 写死？**

运行：

```bash
npm run integration:04
```

这一轮把固定流程：

```text
read
↓
write
↓
answer
```

改成真正循环：

```text
LLM
↓
Tool Call ?
├── read_file
├── write_file
├── run_test
└── no tool → final answer
↓
Tool Result
↓
LLM
↓
Continue / Done
```

第一次在 Integration 中显式维护：

```text
CodingLoopState
├── step
├── maxSteps
├── messages
└── trace
```

### Permission 仍然存在

自由 Loop 不等于自由执行：

```text
LLM
↓
write_file Tool Call
↓
Permission Runtime
↓
allow / ask / deny
```

如果是 `ask`，Loop 会暂停成：

```text
approval_required
```

外部 approve / reject 后，从原来的 `CodingLoopState` 继续，而不是从头重跑。

### run_test

这一轮新增第三个 Tool：

```text
run_test
```

当前它不是任意 Shell，而是固定：

```text
node --test
```

测试失败不会直接终止 Agent，而是作为：

```text
TEST_FAILED
```

返回模型，模型再决定下一步。

### maxSteps

模型决定：

```text
想不想继续
```

Runtime 决定：

```text
最多允许继续多久
```

当前 Demo：

```text
maxSteps = 8
```

```text
04 = Loop
```

详细：[`04-multi-step-coding-loop/README.md`](./04-multi-step-coding-loop/README.md)

---

## 为什么下一步是 Session / Context / Recovery？

现在一个 Run 内已经能：

```text
读取
↓
修改
↓
测试
↓
根据结果继续
```

但它仍然主要是“一次运行里的 Agent”。

还缺：

```text
上一轮发生了什么？
这一轮模型应该看到哪些历史？
Context 太长怎么办？
执行失败以后怎么恢复？
```

所以下一轮进入：

```text
integration:05 · Session / Context / Recovery
```

---

## 当前明确不进入

```text
Session 持久化接入
Compaction Runtime 接入
Recovery Runtime 接入
进程重启恢复
Git
任意 shell
Sub Agent
完整 Coding Agent Runtime
```

---

## 当前 Done 标准

### Integration 04

- [ ] 我知道 03 为什么仍然是固定流程。
- [ ] 我知道 LLM 应根据 Tool Result 决定下一步。
- [ ] 我知道 Tool Call 不等于 Tool Execution。
- [ ] 我知道 write_file 在 Loop 中仍然必须经过 Permission。
- [ ] 我知道 approval_required 为什么要保存 Loop State。
- [ ] 我知道 TEST_FAILED 应作为 Observation 回给模型。
- [ ] 我知道 maxSteps 为什么由 Runtime 控制。
- [ ] 我知道 `01 = Skeleton`、`02 = Inspect`、`03 = Edit`、`04 = Loop`。
- [ ] 我知道下一步为什么需要 Session / Context / Recovery。

做到这些，就进入 **integration:05 · Session / Context / Recovery**。
