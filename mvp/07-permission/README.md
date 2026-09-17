# 07 · Permission 学习

> 核心问题：**Agent 会调用 Tool 以后，为什么不能让它想做什么就做什么？**

当前状态：`LEARNING`

核心边界：

```text
Tool
= Agent 有什么能力

Permission
= 某一次能力调用能不能真正执行
```

Permission 的位置：

```text
LLM
↓
Tool Call
↓
Permission
↓
Tool Execution
```

---

## 学习路线

```text
01 No Permission
   ↓
02 Allow / Deny
   ↓
03 Ask Before Execute
   ↓
04 Resource Scope
   ↓
05 Policy Precedence
   ↓
06 Minimal Permission Runtime
```

当前进度：

```text
01 No Permission              ✅
02 Allow / Deny               ✅
03 Ask Before Execute         ✅
04 Resource Scope             ✅
05 Policy Precedence          ← 当前
06 Minimal Permission Runtime ← 后续
```

---

# 01 · No Permission

```bash
npm run permission:01
```

```text
Tool Call
↓
直接 execute()
```

没有任何权限层。

```text
01 = Unrestricted
```

详细：[`01-no-permission/README.md`](./01-no-permission/README.md)

---

# 02 · Allow / Deny

```bash
npm run permission:02
```

第一次加入：

```text
Tool Call
↓
Permission Gate
↓
├── allow → execute
└── deny  → blocked
```

```text
02 = Gate
```

详细：[`02-allow-deny/README.md`](./02-allow-deny/README.md)

---

# 03 · Ask Before Execute

```bash
npm run permission:03
```

Permission 扩成：

```text
allow / ask / deny
```

`ask` 第一次让 Runtime 出现：

```text
approval_required
↓
等待外部 approve / reject
↓
再决定 execute / blocked
```

模型不能自己批准自己的 Tool Call。

```text
03 = Approval
```

详细：[`03-ask-before-execute/README.md`](./03-ask-before-execute/README.md)

---

# 04 · Resource Scope

```bash
npm run permission:04
```

Permission 不再只看 Tool Name，还开始看：

```text
Tool Arguments
+
Resource Path
```

当前最小 Scope：

```text
workspace 内  → allow
workspace 外  → deny
```

所以同一个 `write_file`，因为 path 不同，可以得到不同 Permission Decision。

```text
04 = Scope
```

详细：[`04-resource-scope/README.md`](./04-resource-scope/README.md)

---

# 05 · Policy Precedence

核心问题：

> **一次 Tool Call 同时命中多条 Permission Rule 时，最终到底听谁的？**

运行：

```bash
npm run permission:05
```

这一轮第一次把 Permission 拆成：

```text
matchRules()
= 哪些规则命中

resolveDecision()
= 命中以后最终谁赢
```

当前学习版人为规定：

```text
deny > ask > allow
```

默认 Policy：

```text
workspace:inside → allow
write_file       → ask
.env             → deny
```

默认验证：

```text
Case A
read_file(workspace/notes.txt)
↓
只命中 allow
↓
final = allow
↓
Tool 执行
```

```text
Case B
write_file(workspace/src/app.txt)
↓
allow + ask
↓
ask > allow
↓
final = ask
↓
approval_required
↓
Tool 不执行
```

```text
Case C
write_file(workspace/.env)
↓
allow + ask + deny
↓
deny > ask > allow
↓
final = deny
↓
blocked
↓
Tool 不执行
```

这一轮真正建立：

> **Permission Rule 可以有很多条，但一次 Tool Call 最终必须收敛成一个 Decision。**

注意：

```text
deny > ask > allow
```

只是当前学习 MVP 的简单策略，不代表所有成熟系统都必须这么设计。

```text
05 = Policy
```

详细：[`05-policy-precedence/README.md`](./05-policy-precedence/README.md)

---

## 五轮连起来

```text
01 = Unrestricted
没有权限层

02 = Gate
allow / deny

03 = Approval
ask + 外部批准

04 = Scope
权限开始关注具体 Resource

05 = Policy
多条 Rule 命中后收敛成一个 Decision
```

也可以这样理解：

```text
04 Scope
= 哪些规则可能命中

05 Policy
= 命中多条以后最终听谁的
```

---

## 为什么下一步是 Minimal Permission Runtime？

现在能力已经散成：

```text
Gate
Approval
Scope
Rule Match
Policy Resolution
```

调用方如果自己组织这些步骤，会越来越乱。

所以下一轮进入：

```text
permission:06 · Minimal Permission Runtime
```

把这些能力收成一个统一入口，让 Agent Runtime 不需要理解 Permission 内部细节。

---

## 当前仍然不进入

```text
复杂 Rule DSL
RBAC
OS Sandbox
容器隔离
企业审批流
网络权限
审批持久化
完整符号链接安全模型
```

---

## 当前 Done 标准

### Permission 05

- [ ] 我知道一条 Tool Call 可以同时命中多条 Rule。
- [ ] 我能区分 Rule Match 和 Policy Resolution。
- [ ] 我知道当前 MVP 的优先级是 `deny > ask > allow`。
- [ ] 我知道这个优先级只是当前学习设计，不是通用标准。
- [ ] 我知道最终只能得到一个 Permission Decision。
- [ ] 我知道 `ask / deny` 时 Tool 不能提前产生副作用。
- [ ] 我知道 `04 = Scope`，`05 = Policy`。
- [ ] 我知道下一步为什么需要 Minimal Permission Runtime。

做到这些，就进入 **permission:06 · Minimal Permission Runtime**。
