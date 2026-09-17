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
04 Resource Scope             ← 当前
05 Policy Precedence          ← 后续
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

核心认识：

> **模型负责提出动作，Runtime 拥有最终执行权。**

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

`ask` 的关键：

```text
Tool Call
↓
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

模型不能自己批准自己的 Tool Call。

```text
03 = Approval
```

详细：[`03-ask-before-execute/README.md`](./03-ask-before-execute/README.md)

---

# 04 · Resource Scope

核心问题：

> **同一个 Tool，操作不同 Resource 时，真的应该得到同一个 Permission Decision 吗？**

运行：

```bash
npm run permission:04
```

前面主要看：

```text
Tool Name
```

这一轮第一次加入：

```text
Tool Name
+
Tool Arguments
+
Resource Path
```

当前只做最小 Scope：

```text
workspace 内
→ allow

workspace 外
→ deny
```

流程：

```text
Tool Call
↓
读取 arguments.path
↓
resolve / relative
↓
Resource Scope
↓
├── inside  → allow → execute
└── outside → deny  → blocked
```

默认验证使用同一个 `write_file`：

```text
Case A
write_file(workspace/src/inside.txt)
→ allow
→ 文件出现

Case B
write_file(workspace 外的 outside.txt)
→ deny
→ 文件不存在
```

真正改变 Permission Decision 的不是 Tool，而是：

```text
arguments.path
```

这一轮最重要的区别：

```text
Capability
= write_file

Resource
= 这次 write_file 真正操作的 path
```

所以：

> **Permission 不只要问“用什么 Tool”，还要问“这个 Tool 要操作什么 Resource”。**

当前实现使用：

```text
path.resolve()
+
path.relative()
```

判断 Resource 是否真正位于 workspace 内，而不是简单字符串 `startsWith()`。

同时，Permission 检查得到的规范化 Resource Path 也会用于真正的 Tool Execution，避免“检查 A、实际执行 B”。

```text
04 = Scope
```

详细：[`04-resource-scope/README.md`](./04-resource-scope/README.md)

---

## 四轮连起来

```text
01 = Unrestricted
没有权限层

02 = Gate
allow / deny

03 = Approval
ask + 外部批准

04 = Scope
权限开始关注具体 Resource
```

---

## 为什么下一步是 Policy Precedence？

现在我们只有一条很纯的 Scope 规则：

```text
workspace 内  → allow
workspace 外  → deny
```

下一步如果加入：

```text
write_file → ask
workspace/** → allow
.env → deny
```

就会出现：

```text
一次 Tool Call
同时命中多条规则
↓
最终到底听谁的？
```

所以下一轮进入：

```text
permission:05 · Policy Precedence
```

研究多个 Permission Rule 冲突时如何得到最终 Decision。

---

## 当前仍然不进入

```text
复杂 RBAC
OS Sandbox
容器隔离
企业审批流
网络权限
符号链接完整安全模型
```

---

## 当前 Done 标准

### Permission 04

- [ ] 我能区分 Capability 和 Resource。
- [ ] 我知道同一个 Tool 可以因为参数不同得到不同 Permission Decision。
- [ ] 我知道 Resource Scope 必须发生在 Tool Execution 之前。
- [ ] 我知道 workspace 外被 deny 后不能产生副作用。
- [ ] 我知道路径 Scope 不能只用字符串前缀判断。
- [ ] 我知道 Permission 检查的 Resource 和 Tool 真正执行的 Resource 应保持一致。
- [ ] 我知道 `03 = Approval`，`04 = Scope`。
- [ ] 我知道下一步为什么需要 Policy Precedence。

做到这些，就进入 **permission:05 · Policy Precedence**。
