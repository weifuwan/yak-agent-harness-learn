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
03 Ask Before Execute         ← 当前
04 Resource Scope             ← 后续
05 Policy Precedence          ← 后续
06 Minimal Permission Runtime ← 后续
```

---

# 01 · No Permission

```bash
npm run permission:01
```

故意让：

```text
Tool Call
↓
找到 Tool
↓
execute()
```

没有任何 Permission Check。

```text
01 = Unrestricted
```

详细：[`01-no-permission/README.md`](./01-no-permission/README.md)

---

# 02 · Allow / Deny

```bash
npm run permission:02
```

第一次形成：

```text
Tool Call
↓
Permission Gate
↓
├── allow → execute
└── deny  → blocked
```

核心认识：

> **模型负责提出动作，Runtime 拥有最终执行权。**

```text
02 = Gate
```

详细：[`02-allow-deny/README.md`](./02-allow-deny/README.md)

---

# 03 · Ask Before Execute

核心问题：

> **有些操作既不适合永远 allow，也不适合永远 deny，能不能先等待外部批准？**

运行：

```bash
npm run permission:03
```

这一轮第一次把 Permission 扩成三态：

```ts
type PermissionDecision =
  | "allow"
  | "ask"
  | "deny"
```

关键流程：

```text
Tool Call
↓
Permission
↓
├── allow
│   ↓
│   execute()
│
├── ask
│   ↓
│   approval_required
│   ↓
│   Tool 暂停执行
│   ↓
│   approve / reject
│   ↓
│   execute / blocked
│
└── deny
    ↓
    blocked
```

`ask` 的关键不是“多一个字符串”，而是 Runtime 第一次出现：

```text
暂停副作用
↓
等待外部决策
↓
再恢复
```

默认验证：

```text
Case A
allow
→ 直接执行

Case B
ask
→ approval_required
→ approve
→ resume
→ 执行

Case C
ask
→ approval_required
→ reject
→ resume
→ blocked
```

而且在 `approval_required` 阶段，目标文件必须仍然不存在，证明 Tool 真的没有提前执行。

最重要的边界：

```text
LLM
= 提出 Tool Call

Permission Runtime
= 判断需要审批

User / External Runtime
= approve / reject
```

模型不能自己批准自己的 Tool Call。

```text
03 = Approval
```

详细：[`03-ask-before-execute/README.md`](./03-ask-before-execute/README.md)

---

## 三轮连起来

```text
01 Unrestricted
= 没有权限层

02 Gate
= allow / deny

03 Approval
= allow / ask / deny
```

---

## 为什么下一步是 Resource Scope？

现在 Permission 仍然只看：

```text
tool name
```

例如：

```text
write_file → ask
```

但很快会发现：

```text
write_file("./src/App.ts")
```

和：

```text
write_file("../other-project/config")
```

不应该天然得到同一个权限结果。

所以下一轮进入：

```text
permission:04 · Resource Scope
```

第一次把：

```text
Tool Name
+
Tool Arguments / Resource
```

一起纳入 Permission Decision。

---

## 当前仍然不进入

```text
Policy Precedence
OS Sandbox
RBAC
企业审批流
审批持久化
复杂 UI
```

---

## 当前 Done 标准

### Permission 03

- [ ] 我能解释 `ask` 和 `allow` 的区别。
- [ ] 我知道 `ask` 必须先返回 `approval_required`，不能提前执行 Tool。
- [ ] 我知道 approve 后才可以恢复并执行。
- [ ] 我知道 reject 后必须 blocked 且没有副作用。
- [ ] 我知道模型不能自己批准自己的 Tool Call。
- [ ] 我能解释为什么 Approval 是外部 Runtime / User 的职责。
- [ ] 我知道 `02 = Gate`，`03 = Approval`。
- [ ] 我知道下一步为什么需要 Resource Scope。

做到这些，就进入 **permission:04 · Resource Scope**。
