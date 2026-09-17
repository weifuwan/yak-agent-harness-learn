# Permission 01 · No Permission

> 核心问题：**如果 Tool Call 产生以后 Runtime 直接执行，会发生什么？**

运行：

```bash
npm run permission:01
```

这一轮故意没有 Permission Layer。

```text
Model Tool Call
↓
找到 Tool
↓
execute()
```

也就是：

```text
Tool Call
↓
Permission Check   ← 不存在
↓
Tool Execution
```

## 默认实验

代码假设模型已经返回：

```text
write_file(temp/unrestricted.txt)
```

为了安全，Demo 只写系统临时目录，并在结束后自动清理。

运行时观察：

```text
file exists before = false
permission check   = NONE
↓
executeToolCall()
↓
file exists after  = true
```

这说明副作用已经真实发生。

## 为什么不调用 LLM？

这一轮研究的是：

```text
Tool Call
→ Tool Execution
```

之间有没有权限边界。

模型为什么选择 `write_file` 已经属于前面的 Tool / Agent Loop 问题，所以这里直接使用一个固定 Tool Call，让实验稳定、可重复。

## 参数校验不是 Permission

`write_file` 仍然会检查：

```text
path 是不是字符串
content 是不是字符串
JSON 是否合法
```

但这只是：

```text
Input Validation
```

不是：

```text
Permission Decision
```

即使参数完全合法，也不代表这次操作应该被允许。

## 这一轮要记住

```text
01 = Unrestricted
```

> **没有 Permission 时，Tool Registry 里存在的能力，一旦被调用就会直接变成真实副作用。**

下一步：

```text
permission:02 · Allow / Deny
```

第一次把：

```text
Tool Call
↓
Permission Gate
↓
Tool Execution
```

真正插进运行路径。
