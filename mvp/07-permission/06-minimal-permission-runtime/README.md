# Permission 06 · Minimal Permission Runtime

> 核心问题：**Gate、Approval、Scope、Policy 都已经有了，Agent Runtime 还应该自己编排这些内部步骤吗？**

运行：

```bash
npm run permission:06
```

---

## 前五轮已经得到什么？

```text
01 Unrestricted
= 没有权限层

02 Gate
= allow / deny

03 Approval
= ask + 外部 approve / reject

04 Scope
= Permission 开始关注具体 Resource

05 Policy
= 多条规则命中后收敛成一个 Decision
```

但这些能力仍然散着。

如果调用方还需要自己写：

```text
build resource
→ match rules
→ resolve decision
→ handle allow / ask / deny
→ execute / wait approval
```

那 Permission 的内部复杂度仍然泄漏给 Agent Runtime。

---

## 这一轮第一次引入

```ts
const permissionRuntime = createPermissionRuntime({
  tools,
  workspaceRoot,
  rules,
})
```

公开入口只保留：

```ts
permissionRuntime.start(toolCall)
permissionRuntime.resume(request, approval)
```

`start()` 统一返回：

```text
executed
approval_required
blocked
```

`resume()` 只处理：

```text
approve
reject
```

---

## Runtime 内部结构

```text
Tool Call
↓
Permission Runtime
↓
Resource Scope
↓
Rule Match
↓
Policy Resolution
↓
├── allow
│   ↓
│   Tool Execution
│   ↓
│   executed
│
├── ask
│   ↓
│   approval_required
│   ↓
│   resume(approve / reject)
│
└── deny
    ↓
    blocked
```

调用方不再需要知道：

```text
workspace path 怎么规范化
哪些 Rule 命中了
deny 为什么比 ask 高
ask 怎么构造 Approval Request
Tool 什么时候才真正 execute
```

---

## 默认验证

### Case A · Allow

```text
read_file(workspace/notes.txt)
→ start()
→ executed
```

### Case B · Ask → Approve

```text
write_file(workspace/src/approved.txt)
→ start()
→ approval_required
→ 文件仍不存在
→ resume(approve)
→ executed
→ 文件出现
```

### Case C · Ask → Reject

```text
write_file(workspace/src/rejected.txt)
→ start()
→ approval_required
→ resume(reject)
→ blocked
→ 文件始终不存在
```

### Case D · Deny

```text
write_file(workspace/.env)
→ start()
→ blocked
→ 文件不存在
```

---

## 为什么现在仍然不用 class？

当前学习版已经有 Runtime 边界，但依赖和状态还很少。

所以先用：

```ts
createPermissionRuntime(...)
```

就足够表达封装。

以后 Integration 阶段如果出现：

```text
配置
持久化 Approval
审计日志
动态 Policy
Session 依赖
```

再自然演进成：

```ts
class PermissionRuntime
```

---

## 当前明确不做

```text
Approval 持久化
多用户审批
RBAC
OS Sandbox
容器隔离
网络权限
完整符号链接安全模型
企业审计
```

---

## Done 标准

- [ ] 我知道 Permission Runtime 不是一种新 Permission，而是统一入口。
- [ ] 我能解释 `start()` 为什么只返回 executed / approval_required / blocked。
- [ ] 我知道 `ask` 时 Tool 不能提前执行。
- [ ] 我知道 approve / reject 是外部输入。
- [ ] 我知道 Scope、Rule Match、Precedence 已经变成 Runtime 内部实现细节。
- [ ] 我能解释 Agent Runtime 为什么不应该自己编排 Permission 内部步骤。
- [ ] 我知道函数式 Runtime 什么时候足够，什么时候 class 才开始有价值。

做到这些，**07 Permission MVP 封板**。
