# Permission 03 · Ask Before Execute

> 核心问题：**有些 Tool 既不能永远 allow，也不应该永远 deny，能不能先问用户？**

运行：

```bash
npm run permission:03
```

---

## 从上一轮开始

`permission:02` 只有：

```text
allow
/
deny
```

问题是：

```text
write_file → 永远 allow
```

太危险；

```text
write_file → 永远 deny
```

又会让 Coding Agent 很难工作。

所以这一轮第一次加入第三种状态：

```ts
type PermissionDecision =
  | "allow"
  | "ask"
  | "deny"
```

---

## ask 的真正含义

`ask` 不是：

```text
ask
↓
自动执行
```

而是：

```text
Tool Call
↓
Permission = ask
↓
approval_required
↓
Tool 暂停执行
```

只有外部再给出：

```text
approve
```

才会：

```text
resume
↓
execute()
```

如果外部给出：

```text
reject
```

则：

```text
resume
↓
blocked
```

---

## 为什么拆成两阶段？

为了把边界看清楚：

```text
模型
= 提出 Tool Call

Permission Runtime
= 发现需要审批

User / 外部 Runtime
= 给出 approve / reject
```

模型不能：

```text
我要执行 write_file
↓
我自己批准
```

审批权必须在模型之外。

---

## 默认验证

### Case A · Allow

```text
write_file
↓
allow
↓
立即执行
```

### Case B · Ask → Approve

```text
write_file
↓
ask
↓
approval_required
↓
此时文件仍不存在
↓
approve
↓
resume
↓
文件出现
```

### Case C · Ask → Reject

```text
write_file
↓
ask
↓
approval_required
↓
此时文件仍不存在
↓
reject
↓
blocked
↓
文件始终不存在
```

Demo 只操作系统临时目录，结束后自动清理。

---

## 这一轮要记住

```text
permission:02
= Gate
= allow / deny
```

```text
permission:03
= Approval
= allow / ask / deny
```

最重要的一句话：

> **ask 会暂停副作用，直到外部审批结果回来。**

---

## 这一轮仍然不做

```text
Path Scope
Workspace Boundary
Policy Precedence
审批持久化
审批 UI
RBAC
OS Sandbox
```

下一步进入：

```text
permission:04 · Resource Scope
```

研究同一个 Tool 是否应该因为操作的资源不同，而得到不同 Permission Decision。
