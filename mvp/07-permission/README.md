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

所以 Permission 的位置是：

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
01 No Permission              ← 当前
02 Allow / Deny               ← 后续
03 Ask Before Execute         ← 后续
04 Resource Scope             ← 后续
05 Policy Precedence          ← 后续
06 Minimal Permission Runtime ← 后续
```

---

# Permission 01 · No Permission

核心问题：

> **如果 Tool Call 产生以后 Runtime 直接执行，会发生什么？**

运行：

```bash
npm run permission:01
```

当前故意没有任何 Permission 设计：

```text
Tool Call
↓
找到 Tool
↓
execute()
```

默认实验假设模型已经返回一个：

```text
write_file
```

Runtime 会直接执行它。

为了安全，Demo 只写系统临时目录，并在结束后自动清理。

重点观察：

```text
permission check   = NONE
file exists before = false
↓
execute()
↓
file exists after  = true
```

也就是说：

> **Tool Call 已经真正变成了副作用，但中间没有任何权限决策。**

注意：Tool 参数校验不是 Permission。

```text
JSON 合法
path 合法
content 合法
```

只说明 Tool 能执行，不说明这次操作应该被允许。

这一轮记成：

```text
01 = Unrestricted
```

详细：[`01-no-permission/README.md`](./01-no-permission/README.md)

---

## 为什么下一步是 Allow / Deny？

现在运行路径是：

```text
Tool Call
↓
直接 Execute
```

新的问题自然出现：

> **能不能在真正执行之前先做一次 Gate？**

所以下一轮进入：

```text
permission:02 · Allow / Deny
```

第一次形成：

```text
Tool Call
↓
Permission Gate
↓
├── allow → execute
└── deny  → 不执行
```

暂时不提前加入：

```text
ask
路径 Scope
Policy Precedence
OS Sandbox
RBAC
企业审批流
```

---

## 当前 Done 标准

### Permission 01

- [ ] 我知道 Permission 位于 Tool Call 和 Tool Execution 之间。
- [ ] 我知道没有 Permission 时 Tool Call 会直接产生真实副作用。
- [ ] 我能区分 Input Validation 和 Permission Decision。
- [ ] 我知道 Tool Registry 有什么能力，不等于每次都应该允许使用。
- [ ] 我知道下一步为什么需要 Allow / Deny Gate。

做到这些，就进入 **permission:02 · Allow / Deny**。
