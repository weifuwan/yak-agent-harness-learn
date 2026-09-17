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
01 No Permission              ✅
02 Allow / Deny               ← 当前
03 Ask Before Execute         ← 后续
04 Resource Scope             ← 后续
05 Policy Precedence          ← 后续
06 Minimal Permission Runtime ← 后续
```

---

# Permission 01 · No Permission

运行：

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

没有：

```text
allow
ask
deny
```

默认实验会真实执行一次 `write_file`，证明 Tool Call 会直接变成副作用。

这一轮看到：

> **没有 Permission 时，Agent 的实际能力边界几乎就是 Tool Registry 的能力边界。**

注意：

```text
参数校验
≠
Permission
```

JSON、path、content 都合法，只代表 Tool 能执行，不代表这次操作应该被允许。

记成：

```text
01 = Unrestricted
```

详细：[`01-no-permission/README.md`](./01-no-permission/README.md)

---

# Permission 02 · Allow / Deny

核心问题：

> **Tool 虽然能执行，Runtime 能不能在真正执行之前先做一次权限 Gate？**

运行：

```bash
npm run permission:02
```

这一轮第一次引入：

```ts
type PermissionDecision = "allow" | "deny"
```

结构从：

```text
Tool Call
↓
execute()
```

变成：

```text
Tool Call
↓
checkPermission()
↓
├── allow → execute()
└── deny  → blocked
```

默认用同一个：

```text
write_file
```

跑两个场景。

### Case A · Allow

```text
write_file
↓
allow
↓
execute()
↓
文件出现
```

### Case B · Deny

```text
write_file
↓
deny
↓
blocked
↓
文件不存在
```

所以这一轮第一次真正建立：

> **模型负责提出 Tool Call，Runtime 决定这个动作能不能真正发生。**

当前 Policy 只看 Tool Name：

```ts
{
  write_file: "allow"
}
```

或：

```ts
{
  write_file: "deny"
}
```

如果没有明确规则，当前最小实现默认：

```text
deny
```

这一轮还不会看 Tool Arguments，也不会根据路径做不同判断。

记成：

```text
02 = Gate
```

详细：[`02-allow-deny/README.md`](./02-allow-deny/README.md)

---

## 前两轮连起来

```text
permission:01
Tool Call
↓
直接执行

permission:02
Tool Call
↓
Permission Gate
↓
allow / deny
↓
决定是否执行
```

也就是：

```text
01 = Unrestricted
02 = Gate
```

---

## 为什么下一步是 Ask？

现在只有：

```text
allow
deny
```

很快就会发现它太死。

例如：

```text
write_file → deny
```

Coding Agent 基本无法修改代码。

但：

```text
write_file → allow
```

又意味着每次写文件都自动执行。

所以自然需要第三种状态：

```text
ask
```

下一轮进入：

```text
permission:03 · Ask Before Execute
```

形成：

```text
Tool Call
↓
Permission
↓
├── allow → execute
├── ask   → 等用户批准
└── deny  → blocked
```

这一轮暂时不提前实现 `ask`。

---

## 当前仍然不进入

```text
Resource Scope
Path Policy
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

### Permission 02

- [ ] 我能解释 Permission Gate 为什么存在。
- [ ] 我能区分 `allow / deny`。
- [ ] 我知道 deny 必须发生在 Tool Execution 之前。
- [ ] 我知道 deny 后 Tool 不应该产生任何副作用。
- [ ] 我知道模型提出 Tool Call，不等于模型拥有最终执行权。
- [ ] 我知道当前只按 Tool Name 判断，还没有 Resource Scope。
- [ ] 我知道下一步为什么需要 `ask`。

做到这些，就进入 **permission:03 · Ask Before Execute**。
