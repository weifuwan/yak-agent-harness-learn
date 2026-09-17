# Permission 02 · Allow / Deny

> 核心问题：**Tool 虽然能执行，但 Runtime 能不能在真正执行之前先决定允许还是拒绝？**

运行：

```bash
npm run permission:02
```

---

## 从 permission:01 开始

上一轮是：

```text
Tool Call
↓
找到 Tool
↓
execute()
```

只要 Tool 已注册，Tool Call 就直接变成真实副作用。

这一轮第一次插入：

```text
Permission Gate
```

结构变成：

```text
Tool Call
↓
checkPermission()
↓
├── allow → execute()
└── deny  → blocked
```

---

## 最小 Permission Decision

这一轮只允许两种结果：

```ts
type PermissionDecision = "allow" | "deny"
```

最小 Policy：

```ts
{
  write_file: "allow"
}
```

或者：

```ts
{
  write_file: "deny"
}
```

当前只按 Tool Name 判断。

还不会看：

```text
path
arguments
workspace
风险等级
用户身份
```

这些后面再学。

---

## 默认实验

使用同一个：

```text
write_file
```

分别跑两个 Policy。

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

Demo 只操作系统临时目录，并在结束后自动清理。

---

## 这一轮真正新增什么？

不是 Tool。

Tool 在 permission:01 就已经能写文件。

新增的是：

```text
Tool Call
↓
Permission Decision
↓
Tool Execution
```

所以：

> **模型负责提出动作，Runtime 负责决定动作是否允许真正发生。**

这一轮记成：

```text
02 = Gate
```

---

## 一个重要边界

```text
allow / deny
```

现在只针对 Tool Name。

所以：

```text
write_file("./src/App.ts")
```

和：

```text
write_file("../other-project/config")
```

当前会得到同一个权限结果。

这个缺陷故意保留。

因为 Resource Scope 要留到后面。

---

## 为什么下一步是 Ask？

很快会发现：

```text
read_file → allow
write_file → deny
```

太死。

Coding Agent 如果永远不能写文件，基本无法完成工作。

但：

```text
write_file → 永远 allow
```

又太危险。

于是自然需要第三种结果：

```text
ask
```

也就是：

```text
Tool Call
↓
Permission
↓
├── allow
├── ask → 等用户批准
└── deny
```

下一步：

```text
permission:03 · Ask Before Execute
```

这一轮暂时不提前实现 `ask`。
