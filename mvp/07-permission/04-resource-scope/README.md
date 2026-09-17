# Permission 04 · Resource Scope

> 核心问题：**同一个 Tool，操作不同资源时，真的应该得到同一个 Permission Decision 吗？**

运行：

```bash
npm run permission:04
```

---

## 从上一轮开始

`permission:03` 已经有：

```text
allow / ask / deny
```

但判断依据仍然主要是：

```text
Tool Name
```

例如：

```text
write_file → ask
```

问题是：

```text
write_file("workspace/src/App.ts")
```

和：

```text
write_file("workspace 外的文件")
```

虽然都是 `write_file`，实际作用的资源完全不同。

所以这一轮第一次把：

```text
Tool Name
+
Tool Arguments
+
Resource Path
```

一起放进 Permission 判断。

---

## 最小规则

这一轮只定义一个最简单的 Scope：

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
规范化路径
↓
判断是否位于 workspaceRoot 内
↓
├── inside  → allow → execute
└── outside → deny  → blocked
```

---

## 为什么不用字符串 startsWith？

例如：

```text
workspace:
D:\work\project

resource:
D:\work\project-other\a.txt
```

如果只做字符串前缀比较，可能错误认为 resource 在 workspace 内。

所以当前 MVP 使用：

```text
path.resolve()
+
path.relative()
```

判断规范化后的 Resource 是否真的落在 Workspace 范围内。

这一轮还没有处理符号链接等更复杂的文件系统边界。

---

## 默认验证

Demo 会创建一个临时根目录：

```text
demo-root/
├── workspace/
└── outside/
```

### Case A · Inside Workspace

```text
write_file(workspace/src/inside.txt)
↓
resource inside workspace
↓
allow
↓
文件出现
```

### Case B · Outside Workspace

```text
write_file(outside/outside.txt)
↓
resource outside workspace
↓
deny
↓
blocked
↓
文件不存在
```

两个场景调用的是同一个 Tool。

真正改变 Permission Decision 的是：

```text
arguments.path
```

---

## Capability 和 Resource

这一轮最重要的区别：

```text
Capability
= write_file

Resource
= 这次 write_file 要操作的具体 path
```

所以：

```text
Tool Permission
≠
Resource Permission
```

Permission 不能永远只问：

```text
你想用什么 Tool？
```

还要开始问：

```text
你想用这个 Tool 操作什么？
```

---

## 为什么执行前还要规范化参数？

Scope 检查得到一个规范化后的绝对 Resource Path。

真正调用 Tool 时，也使用同一个规范化路径。

这样避免：

```text
Permission 检查的是路径 A
但 Tool 因为 cwd / 相对路径实际操作了路径 B
```

即：

> **Permission 检查的资源，必须和 Tool 真正执行的资源一致。**

---

## 这一轮仍然不做

```text
.env 特殊保护
多个 Path Rule
Tool Rule + Path Rule 冲突
allow / ask / deny 优先级
符号链接逃逸
OS Sandbox
RBAC
```

这些不是当前问题。

尤其不要现在加入：

```text
workspace/** → allow
.env          → deny
```

因为这会立刻产生新的问题：

```text
两条规则同时命中，到底听谁的？
```

这正是下一轮。

---

## 这一轮记住

```text
01 = Unrestricted
02 = Gate
03 = Approval
04 = Scope
```

一句话：

> **Permission 04 让权限判断从“能不能用这个 Tool”，升级成“能不能用这个 Tool 操作这个具体 Resource”。**

下一步：

```text
permission:05 · Policy Precedence
```
