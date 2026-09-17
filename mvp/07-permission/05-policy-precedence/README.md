# Permission 05 · Policy Precedence

> 核心问题：**一次 Tool Call 同时命中多条 Permission Rule 时，最终到底听谁的？**

运行：

```bash
npm run permission:05
```

---

## 从上一轮开始

`permission:04` 已经让 Permission 不只看 Tool Name，还开始看具体 Resource：

```text
Tool Call
+
Resource Path
↓
Scope
```

但真实规则很快会变成多条：

```text
workspace/** → allow
write_file   → ask
.env         → deny
```

于是一次 Tool Call 可能同时命中多个结果。

例如：

```text
write_file(".env")
```

可能同时命中：

```text
workspace/** → allow
write_file   → ask
.env         → deny
```

最终只能得到一个 Decision。

---

## 这一轮第一次拆成两步

```text
matchRules()
= 哪些 Rule 命中了
```

```text
resolveDecision()
= 命中以后最终听谁的
```

流程：

```text
Tool Call
↓
Permission Input
↓
matchRules()
↓
Matched Rules
↓
resolveDecision()
↓
allow / ask / deny
```

---

## 当前学习版优先级

这一轮人为规定：

```text
deny
>
ask
>
allow
```

也就是：

```text
只要命中 deny
→ 最终 deny

否则只要命中 ask
→ 最终 ask

否则命中 allow
→ allow
```

注意：

> **这只是当前 MVP 为了理解 Policy Resolution 使用的简单规则，不代表所有成熟系统都必须使用这套优先级。**

---

## 默认 Policy

```text
workspace:inside
→ allow

write_file
→ ask

.env
→ deny
```

默认验证三个场景。

### Case A · Only Allow

```text
read_file(workspace/notes.txt)
↓
workspace:inside = allow
↓
final = allow
↓
Tool 执行
```

### Case B · Allow + Ask

```text
write_file(workspace/src/app.txt)
↓
workspace:inside = allow
write_file       = ask
↓
ask > allow
↓
final = ask
↓
approval_required
↓
Tool 不执行
```

### Case C · Allow + Ask + Deny

```text
write_file(workspace/.env)
↓
workspace:inside = allow
write_file       = ask
.env             = deny
↓
deny > ask > allow
↓
final = deny
↓
blocked
↓
Tool 不执行
```

---

## 这一轮真正学什么？

不是 `.env` 本身。

而是：

> **Permission Rule 可以有很多条，但一次 Tool Call 最终必须被收敛成一个 Decision。**

所以：

```text
Scope
= 哪些规则可能命中

Policy Precedence
= 多条规则命中以后最终听谁的
```

---

## 为什么不直接写 if？

如果一直写：

```text
if path outside → deny
if write_file → ask
if .env → deny
```

规则越多，最终行为越难解释。

这一轮开始把它拆成：

```text
Rules
↓
Match
↓
Resolution
```

这就是 Policy 开始出现的地方。

---

## 这一轮仍然不做

```text
完整 Permission Runtime
Approval Resume
复杂 Rule DSL
Rule Specificity
用户级 / Agent 级 Policy
RBAC
OS Sandbox
企业审批流
```

这些不在当前问题里。

---

## 这一轮记住

```text
04 = Scope
05 = Policy
```

一句话：

> **Scope 决定“哪些规则命中”，Policy Precedence 决定“命中多条以后谁赢”。**

下一步：

```text
permission:06 · Minimal Permission Runtime
```

把：

```text
Gate
Approval
Scope
Policy
```

统一收进一个最小 Permission Runtime。
