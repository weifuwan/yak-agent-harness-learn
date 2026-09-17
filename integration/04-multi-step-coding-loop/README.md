# Integration 04 · Multi-Step Coding Loop

> 核心问题：**Coding Agent 的下一步为什么不能永远由 Runtime 预先写死？**

运行：

```bash
npm run integration:04
```

默认任务：

```text
把 config.ts 里的 port 从 3000 改成 8080，并运行测试确认通过。
```

---

## 03 的限制

`integration:03` 虽然已经能修改文件，但流程仍然是固定的：

```text
read_file
↓
write_file
↓
answer
```

也就是：

```text
下一步做什么
= Runtime 预先决定
```

这不够像真正的 Coding Agent。

---

## 04 的变化

这一轮重新接回 Agent Loop：

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
继续决定下一步
```

所以：

```text
下一步做什么
= LLM 根据当前 Observation 决定

Tool 能不能真正执行
= Runtime / Permission 决定
```

---

## 三个 Tool

当前只给三个能力：

```text
read_file
write_file
run_test
```

### read_file

读取工作区真实文件。

### write_file

产生副作用，所以仍然必须经过 Permission Runtime。

### run_test

当前学习版不是任意 shell：

```text
run_test
=
固定执行 node --test
```

测试失败会作为普通 Tool Result：

```text
TEST_FAILED
...
```

重新返回模型，让模型决定下一步。

测试成功则返回：

```text
TEST_PASSED
...
```

---

## Permission 在 Loop 中的位置

即使进入自由 Loop，也不能变成：

```text
LLM → write_file.execute()
```

仍然必须：

```text
LLM
↓
write_file Tool Call
↓
Permission Runtime
↓
allow / ask / deny
```

如果是 `ask`：

```text
Loop State
↓
暂停
↓
approval_required
```

外部 approve / reject 后：

```text
resume(pending, approval)
↓
把结果作为 Tool Result 放回原 Loop State
↓
继续下一轮模型调用
```

不会从 Step 1 重跑。

---

## Loop State

这一轮第一次在 Integration 中显式维护：

```text
CodingLoopState
├── step
├── maxSteps
├── messages
└── trace
```

它回答：

```text
当前是第几轮？
模型已经看过什么？
执行过哪些 Tool？
下一轮应该基于哪些 Observation 继续？
```

---

## 为什么还需要 maxSteps？

因为模型可能不断：

```text
read
→ write
→ test
→ read
→ write
→ test
→ ...
```

所以 Runtime 仍然保留最终控制权：

```text
模型决定想不想继续
Runtime 决定最多能继续多久
```

当前 Demo：

```text
maxSteps = 8
```

如果模型在最后一个 Model Turn 仍然提出 Tool Call，Runtime 会停止，不再执行这个 Tool，避免越过上限继续产生副作用。

---

## 默认 Demo

工作区会临时创建：

```text
config.ts
config.test.js
```

初始：

```text
config.ts
port = 3000
```

测试要求：

```text
port = 8080
```

Agent 应该自己形成类似流程：

```text
read_file(config.ts)
↓
write_file(config.ts)
↓
Permission → approve
↓
run_test
↓
TEST_PASSED
↓
final answer
```

具体 Tool 顺序不是 Runtime 写死的，由模型自己决定。

Demo 驱动层会自动 approve 普通工作区写入，只是为了把整个 Loop 连续展示出来；Permission Runtime 本身没有自动批准能力。

---

## 当前明确不做

```text
Session 持久化
Compaction
Recovery Runtime
进程重启恢复
任意 shell
Git
多 Tool 并行调用
Sub Agent
```

这些不是这一轮的问题。

---

## 这轮要记住

```text
01 = Skeleton
02 = Inspect
03 = Edit
04 = Loop
```

最重要的一句话：

> **LLM 决定下一步想做什么，Runtime 决定这一步能不能安全执行，以及最多允许执行多久。**

---

## Done 标准

- [ ] 我知道 03 的流程为什么仍然是写死的。
- [ ] 我能解释真正 Agent Loop 为什么必须让模型根据 Tool Result 决定下一步。
- [ ] 我知道 Tool Call 不等于 Tool Execution。
- [ ] 我知道 write_file 在 Loop 中仍然必须经过 Permission。
- [ ] 我知道 approval_required 为什么要保存 Loop State，而不是从头重跑。
- [ ] 我知道测试失败应该作为 Observation 回给模型，而不是直接结束整个 Agent。
- [ ] 我知道 maxSteps 为什么仍然由 Runtime 控制。
- [ ] 我知道 `01 = Skeleton`、`02 = Inspect`、`03 = Edit`、`04 = Loop`。
- [ ] 我知道下一步为什么要接 Session / Context / Recovery。
