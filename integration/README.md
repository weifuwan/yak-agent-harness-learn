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
03 Read → Edit → Permission → Write  ← 当前
04 Multi-Step Coding Loop            ← 后续
05 Session / Context / Recovery      ← 后续
06 Minimal Coding Agent Runtime      ← 后续
```

---

# 01 · Agent Skeleton

```bash
npm run integration:01
```

只接：

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

只允许一次读取，不提前进入完整 Agent Loop。

```text
02 = Inspect
```

详细：[`02-read-think-answer/README.md`](./02-read-think-answer/README.md)

---

# 03 · Read → Edit → Permission → Write

核心问题：

> **Agent 已经会读文件以后，怎样安全地让它真的修改文件？**

运行：

```bash
npm run integration:03
```

完整链路：

```text
User
↓
LLM
↓
read_file
↓
真实文件内容
↓
LLM
↓
write_file Tool Call
↓
Permission Runtime
↓
allow / ask / deny
↓
Tool Execution
↓
LLM
↓
Answer
```

默认 `write_file` 会命中：

```text
ask
```

所以：

```text
Tool Call
≠
Tool Execution
```

模型只能提出写入意图，Runtime 拥有最终执行权。

默认 Demo 会分别验证：

```text
reject
→ 文件不变

approve
→ 文件真正改成 port = 8080
```

这一轮还把读写范围统一到：

```text
workspaceRoot
```

并增加硬边界：

```text
outside workspace → deny
write_file inside → ask
.env → deny
```

```text
03 = Edit
```

详细：[`03-read-edit-permission-write/README.md`](./03-read-edit-permission-write/README.md)

---

## 为什么下一步是 Multi-Step Coding Loop？

现在流程还是写死的：

```text
read once
↓
write once
↓
answer
```

但真实 Coding Agent 可能需要：

```text
read A
↓
read B
↓
write A
↓
write B
↓
run_test
↓
失败
↓
继续修改
```

这时候就不能再手写：

```text
Turn 1 = read
Turn 2 = write
Turn 3 = answer
```

需要真正恢复：

```text
Model
↓
Tool
↓
Observation
↓
Model
↓
Continue / Done
```

所以下一轮进入：

```text
integration:04 · Multi-Step Coding Loop
```

---

## 当前明确不进入

```text
run_test
多个文件连续修改
任意多 Tool Round
Session 持久化
Compaction
Recovery
完整 Coding Agent Runtime
```

---

## 当前 Done 标准

### Integration 03

- [ ] 我知道 read_file 和 write_file 的风险不同。
- [ ] 我知道 Tool Call 不等于 Tool Execution。
- [ ] 我知道 Permission 必须放在 Tool Call 和 Tool Execution 之间。
- [ ] 我知道 `ask` 时文件不能提前变化。
- [ ] 我知道 approve / reject 必须来自 Runtime 外部，而不是 LLM 自己批准自己。
- [ ] 我知道 workspaceRoot 是读写和 Permission Scope 的共同边界。
- [ ] 我知道 `01 = Skeleton`、`02 = Inspect`、`03 = Edit`。
- [ ] 我知道下一步为什么需要真正的 Multi-Step Coding Loop。

做到这些，就进入 **integration:04 · Multi-Step Coding Loop**。
