# Integration 03 · Read → Edit → Permission → Write

> 核心问题：**模型已经会读项目文件以后，怎样安全地让它产生真实修改？**

运行：

```bash
npm run integration:03
```

默认任务：

```text
请把 config.ts 里的 port 从 3000 改成 8080。
```

---

## 这一轮第一次接什么？

```text
read_file
+
write_file
+
Permission Runtime
```

流程：

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
```

默认规则下，`write_file` 是：

```text
ask
```

所以模型提出写入后，文件还不会变化。

---

## Case A · Reject

```text
port = 3000
↓
LLM 提出 write_file
↓
Permission = ask
↓
approval_required
↓
reject
↓
port 仍然 = 3000
```

证明：

> **Tool Call 只是模型的执行意图，不是已经执行。**

---

## Case B · Approve

```text
port = 3000
↓
LLM 提出 write_file
↓
Permission = ask
↓
approval_required
↓
approve
↓
write_file.execute()
↓
port = 8080
```

真正产生副作用的是 Tool Execution。

---

## 为什么要有 workspaceRoot？

这一轮读写必须围绕同一个工作区：

```text
workspaceRoot
├── read_file
├── write_file
└── Permission Scope
```

否则可能出现：

```text
读的是一个项目
权限判断的是另一个路径空间
```

Integration 还增加了硬边界：

```text
outside workspace → deny
write_file inside → ask
.env → deny
```

所以即使外部给出 `approve`，workspace 外文件也不能写。

---

## 三层职责

```text
LLM
= 提出怎么改

Permission Runtime
= 决定这次能不能执行

Tool
= 真正产生副作用
```

不要把三者混成：

```text
模型想写
=
文件已经写了
```

---

## 为什么还不是 Multi-Step Coding Agent？

这一轮故意限制为：

```text
Turn 1 → read_file
Turn 2 → write_file
Permission → approve / reject
Turn 3 → final answer
```

写完以后不再提供 Tool。

所以当前还不会：

```text
读多个文件
写多个文件
run_test
测试失败后继续修改
无限 Loop
Recovery
```

这些留给：

```text
integration:04 · Multi-Step Coding Loop
```

---

## 这轮要记住

```text
01 = Skeleton
02 = Inspect
03 = Edit
```

最重要的一句话：

> **修改方案可以由 LLM 提出，但副作用的最终执行权必须留在 Runtime。**

---

## Done 标准

- [ ] 我知道 read_file 和 write_file 的风险等级不同。
- [ ] 我知道 Tool Call 不等于 Tool Execution。
- [ ] 我知道 Permission 必须位于 Tool Call 和 Tool Execution 之间。
- [ ] 我知道 `ask` 状态下不能产生任何写入副作用。
- [ ] 我知道 approve / reject 是外部输入，不能由模型自己决定。
- [ ] 我知道 workspace 外必须是硬边界。
- [ ] 我知道 `01 = Skeleton`、`02 = Inspect`、`03 = Edit`。
- [ ] 我知道下一步为什么要进入 Multi-Step Coding Loop。
