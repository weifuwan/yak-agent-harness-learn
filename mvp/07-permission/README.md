# 07 · Permission 学习

> 核心问题：**Agent 会调用 Tool 以后，为什么不能让它想做什么就做什么？**

状态：`COMPLETE`

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
Permission Runtime
↓
Tool Execution / Approval / Blocked
```

---

## 学习路线

```text
01 No Permission              ✅
02 Allow / Deny               ✅
03 Ask Before Execute         ✅
04 Resource Scope             ✅
05 Policy Precedence          ✅
06 Minimal Permission Runtime ✅
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

没有权限层，Tool Call 会直接变成真实副作用。

```text
01 = Unrestricted
```

详细：[`01-no-permission/README.md`](./01-no-permission/README.md)

---

# 02 · Allow / Deny

```bash
npm run permission:02
```

第一次加入 Gate：

```text
Tool Call
↓
Permission
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

`ask` 不等于 allow：

```text
ask
↓
approval_required
↓
Tool 暂停执行
↓
approve / reject
↓
execute / blocked
```

```text
03 = Approval
```

详细：[`03-ask-before-execute/README.md`](./03-ask-before-execute/README.md)

---

# 04 · Resource Scope

```bash
npm run permission:04
```

Permission 开始同时看：

```text
Tool Name
+
Tool Arguments
+
Resource
```

当前最小 Scope：

```text
workspace 内  → allow
workspace 外  → deny
```

```text
04 = Scope
```

详细：[`04-resource-scope/README.md`](./04-resource-scope/README.md)

---

# 05 · Policy Precedence

```bash
npm run permission:05
```

一次 Tool Call 可能同时命中多条规则。

当前学习版人为规定：

```text
deny > ask > allow
```

流程：

```text
matchRules()
↓
多个 Decision
↓
resolveDecision()
↓
一个最终 Decision
```

```text
05 = Policy
```

详细：[`05-policy-precedence/README.md`](./05-policy-precedence/README.md)

---

# 06 · Minimal Permission Runtime

```bash
npm run permission:06
```

前五轮的能力最终收进：

```ts
const permissionRuntime = createPermissionRuntime({
  tools,
  workspaceRoot,
  rules,
})
```

调用方只面对：

```ts
permissionRuntime.start(toolCall)
permissionRuntime.resume(request, approval)
```

内部负责：

```text
Resource Scope
+
Rule Match
+
Policy Resolution
+
Approval
+
Tool Execution
```

`start()` 统一返回：

```text
executed
approval_required
blocked
```

```text
06 = Runtime
```

详细：[`06-minimal-permission-runtime/README.md`](./06-minimal-permission-runtime/README.md)

---

## 六轮连起来

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
多条规则冲突时得到最终 Decision

06 = Runtime
把判断、审批和执行收进统一入口
```

最终链路：

```text
Tool Call
↓
Permission Runtime
↓
Scope
↓
Rules
↓
Policy Resolution
↓
├── allow → execute
├── ask   → approval_required → resume
└── deny  → blocked
```

---

## 当前明确没有进入

```text
Approval 持久化
复杂 RBAC
OS Sandbox
容器隔离
网络权限
企业审批流
企业审计
完整符号链接安全模型
```

这些复杂度等真正遇到问题以后再引入。

---

## Permission MVP 最终结论

> **Tool 决定 Agent 有什么能力；Permission 决定某一次能力调用能不能真正发生。**

> **模型可以提出动作，但最终执行权属于 Runtime / User，而不是模型自己。**

到这里，**07 Permission MVP 封板**。

下一阶段：

```text
08 · Recovery MVP
```
