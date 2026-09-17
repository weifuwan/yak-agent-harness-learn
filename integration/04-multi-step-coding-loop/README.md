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
Tool Call(s) ?
├── read_file
├── write_file
├── run_test
└── no tool → final answer
↓
Tool Result(s)
↓
LLM
↓
继续决定下一步
```

所以：

```text
下一步想做什么
= LLM 根据当前 Observation 决定

Tool 能不能真正执行
= Runtime / Permission 决定
```

---

## 一个 Model Turn 可以有多个 Tool Call

真实运行中，模型不一定遵守：

```text
每轮只调用一个工具
```

它可能一次返回：

```text
Assistant Turn
├── read_file(config.ts)
└── read_file(config.test.js)
```

所以 Runtime 不能假设：

```text
1 Model Turn = 0 / 1 Tool Call
```

当前正确模型是：

```text
1 Model Turn = 0..N Tool Calls
```

Runtime 会：

```text
收到 Tool Batch
↓
按顺序处理 Tool Call 1..N
↓
每个 Tool Call 都生成自己的 Tool Result
↓
整批完成
↓
再进入下一次 LLM Turn
```

当前学习版**不是并行执行**，而是顺序执行同一批 Tool Call。

这样 Permission、副作用顺序和 trace 更容易观察。

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

## Permission 在 Tool Batch 中的位置

即使一个 Assistant Turn 同时返回多个 Tool Call，也不能变成：

```text
LLM → write_file.execute()
```

遇到 `write_file` 仍然必须：

```text
write_file Tool Call
↓
Permission Runtime
↓
allow / ask / deny
```

如果是 `ask`：

```text
当前 Tool Batch
↓
暂停在这个 write_file
↓
approval_required
```

Runtime 会保存：

```text
当前 Loop State
当前 write_file
同一批剩余 Tool Calls
```

外部 approve / reject 后：

```text
resume(...)
↓
先给当前 write_file 补 Tool Result
↓
继续处理同一批剩余 Tool Calls
↓
整批完成后
↓
再调用 LLM
```

不会从 Step 1 重跑，也不会丢掉同一 Assistant Turn 里的其他 Tool Call。

---

## Loop State

这一轮在 Integration 中显式维护：

```text
CodingLoopState
├── step
├── maxSteps
├── messages
└── trace
```

它回答：

```text
当前是第几个 Model Turn？
模型已经看过什么？
执行过哪些 Tool？
下一轮应该基于哪些 Observation 继续？
```

同一个 Model Turn 的多个 Tool Call：

```text
step 相同
trace 有多条
```

---

## maxSteps 统计什么？

`maxSteps` 统计：

```text
Model Turn 数量
```

不是：

```text
Tool Call 数量
```

例如：

```text
step = 1
├── read_file(A)
└── read_file(B)
```

仍然只是：

```text
1 个 Model Turn
```

当前 Demo：

```text
maxSteps = 8
```

如果模型在最后一个 Model Turn 仍然提出一批 Tool Call，Runtime 会整批停止、不再执行，避免超过上限以后继续产生副作用。

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

Agent 可能形成类似流程：

```text
Model Turn 1
├── read_file(config.ts)
└── read_file(config.test.js)

Model Turn 2
└── write_file(config.ts)
    ↓
    Permission → approve

Model Turn 3
└── run_test
    ↓
    TEST_PASSED

Model Turn 4
└── final answer
```

具体 Tool 顺序和每轮 Tool 数量不是 Runtime 写死的，由模型自己决定。

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
Tool 并行执行
Sub Agent
```

---

## 这轮要记住

```text
01 = Skeleton
02 = Inspect
03 = Edit
04 = Loop
```

最重要的一句话：

> **一个 Model Turn 可以提出多个 Tool Call；Runtime 必须给这一批中的每个 Tool Call 补齐结果，再让模型继续思考。**

---

## Done 标准

- [ ] 我知道 03 的流程为什么仍然是写死的。
- [ ] 我知道 LLM 应根据 Tool Result 决定下一步。
- [ ] 我知道一个 Model Turn 可以返回多个 Tool Call。
- [ ] 我知道同一批 Tool Call 必须全部得到对应 Tool Result 后才能进入下一轮模型调用。
- [ ] 我知道 write_file 在 Tool Batch 中仍然必须经过 Permission。
- [ ] 我知道 approval_required 为什么要保存当前 Tool Call 和剩余 Tool Calls。
- [ ] 我知道 TEST_FAILED 应作为 Observation 回给模型。
- [ ] 我知道 maxSteps 统计的是 Model Turn，不是 Tool Call。
- [ ] 我知道 `01 = Skeleton`、`02 = Inspect`、`03 = Edit`、`04 = Loop`。
- [ ] 我知道下一步为什么需要 Session / Context / Recovery。
