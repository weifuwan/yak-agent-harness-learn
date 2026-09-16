# Tool 06 · Multiple Tools

核心问题：**当 Tool 从 1 个变成多个，程序怎么知道该执行哪个？**

`tool:05` 已经完成单个 Tool 的完整闭环：

```text
User
↓
LLM
↓
Tool Call
↓
Application 执行 Tool
↓
Tool Result
↓
LLM
↓
Final Assistant
```

但之前只有一个：

```text
add
```

所以程序几乎没有“Tool 管理”问题。

这一节把可用 Tool 扩成 3 个：

```text
add
get_current_time
read_file
```

---

## 这次新增什么？

### add

```text
输入：a, b
输出：a + b
```

### get_current_time

```text
输入：{}
输出：当前服务器 ISO-8601 UTC 时间
```

### read_file

```text
输入：path
输出：当前项目目录里的 UTF-8 文本内容
```

`read_file` 只允许读取当前项目目录内部文件，并限制最大返回长度。

这不是完整 Permission 系统，只是最基本的执行边界。

---

## 模型现在看到什么？

请求里的 `tools` 变成：

```text
[
  add schema,
  get_current_time schema,
  read_file schema
]
```

DeepSeek 会根据 User Prompt 自己选择最合适的 Tool。

例如：

```text
“请计算 123 + 456”
→ add
```

```text
“现在几点？”
→ get_current_time
```

```text
“请读取 package.json”
→ read_file
```

DeepSeek 当前 Chat Completions API 允许在 `tools` 中提供多个 function，且 Tool 名称必须唯一；`tool_choice = auto` 时，模型可以直接回答，也可以选择一个或多个 Tool。

---

## 运行

### 测试 add

```bash
npm run tool:06 -- "请使用工具计算 123 + 456"
```

### 测试当前时间

```bash
npm run tool:06 -- "请使用工具告诉我当前服务器时间"
```

### 测试 read_file

```bash
npm run tool:06 -- "请读取 package.json，并告诉我项目名称"
```

建议三个都跑一次。

重点观察：

```text
name = add
```

或：

```text
name = get_current_time
```

或：

```text
name = read_file
```

---

## Application 怎么执行不同 Tool？

这一节故意不做高级抽象。

代码里直接写：

```ts
if (name === "add") {
  ...
}

if (name === "get_current_time") {
  ...
}

if (name === "read_file") {
  ...
}
```

也就是：

```text
Tool Call
↓
function.name
↓
Application 判断 name
├── add
├── get_current_time
└── read_file
↓
执行对应函数
```

这个实现现在完全能工作。

而且在只有 3 个 Tool 时，还不算特别糟。

---

## 为什么故意不抽象？

因为这一节就是为了亲眼看到问题如何出现。

Tool 增加以后，不只是函数数量增加。

每个 Tool 都可能有：

```text
Schema
参数类型
参数解析
参数校验
执行函数
返回结果
错误处理
```

于是代码会开始变成：

```text
add schema
add validation
add execute

get_current_time schema
get_current_time validation
get_current_time execute

read_file schema
read_file validation
read_file execute

if name === add ...
if name === get_current_time ...
if name === read_file ...
```

如果继续增加：

```text
write_file
list_files
search
http_request
run_command
...
```

管理问题会越来越明显。

这时候再抽象才有意义。

---

## Multiple Tools 不等于 Multiple Tool Calls

这一节要特别区分两个概念。

### Multiple Tools

表示：

```text
模型有多个 Tool 可以选择
```

当前就是：

```text
add
get_current_time
read_file
```

### Multiple Tool Calls

表示一次模型响应里同时返回：

```text
tool_call_1
tool_call_2
...
```

DeepSeek API 可以返回一个或多个 Tool Call。

但这一节为了保持学习边界，代码刻意只接受：

```text
一次运行最多 1 个 Tool Call
```

如果模型一次返回多个，程序会直接报错。

并行 / 多 Tool Call 执行以后真正遇到时再学。

---

## 当前完整流程

```text
User
↓
DeepSeek
↓
从多个 Tools 中选择
↓
Tool Call
name = ?
↓
Application
↓
if / else 分发
↓
执行对应 Tool
↓
Tool Result
↓
role = tool
↓
DeepSeek
↓
Final Assistant
```

这一轮仍然不是 Agent Loop。

因为流程依然固定：

```text
第一次 LLM
↓
最多一次 Tool
↓
第二次 LLM
↓
结束
```

---

## 06 真正要看见的问题

如果 Tool 只有 1 个：

```text
add
```

几乎不需要管理。

Tool 变成多个以后：

```text
Tool 越多
↓
Schema 越多
↓
参数校验越多
↓
执行分支越多
↓
if / else 越来越长
↓
需要统一管理
```

所以：

```text
Tool 06
先看到管理问题

Tool 07
再解决管理问题
```

这和前面 LLM 的学习方式完全一样：

> **先出现真实变化点，再抽象。**

---

## 当前不要做

```text
Tool Interface        ❌
Tool Registry         ❌
泛型 Tool             ❌
自动 Schema 生成      ❌
Dependency Injection  ❌
Agent Loop            ❌
并行 Tool Calls       ❌
完整 Permission       ❌
```

现在允许 `if / else` 看起来有点笨。

因为它正是下一节的学习材料。

---

## Done 标准

- [ ] 我知道 Multiple Tools 表示模型有多个 Tool 可以选择。
- [ ] 我实际测试过 `add / get_current_time / read_file`。
- [ ] 我知道模型通过 `function.name` 告诉 Application 要执行哪个 Tool。
- [ ] 我能看懂当前 `if / else` 分发逻辑。
- [ ] 我知道每个 Tool 都有自己的 Schema / 参数 / 校验 / 执行逻辑。
- [ ] 我能解释 Tool 增加后为什么代码开始变乱。
- [ ] 我能区分 Multiple Tools 和 Multiple Tool Calls。
- [ ] 我知道当前仍然只允许一次运行执行一个 Tool Call。
- [ ] 我理解为什么现在才开始需要 Tool Interface / Registry。

做到这些，就进入 **tool:07 · Unified Tool Interface**。
