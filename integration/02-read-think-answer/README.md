# Integration 02 · Read → Think → Answer

> 核心问题：**Mini Coding Agent 不知道项目里的真实内容时，怎么主动读取，而不是靠猜？**

运行：

```bash
npm run integration:02
```

默认问题：

```text
请读取 package.json，只告诉我 engines.node 的值，并说明这个结论来自 package.json。
```

---

## 这一轮第一次接什么？

只接一个 Tool：

```text
read_file
```

完整流程：

```text
User
↓
Context Runtime
↓
LLM
↓
read_file Tool Call
↓
Tool Execution
↓
Tool Result
↓
LLM
↓
Answer
```

这是真正的：

```text
Read
↓
Think
↓
Answer
```

---

## 为什么需要新的 Tool-capable Provider 边界？

`integration:01` 使用的统一 `Provider.chat()` 只需要处理普通文本消息。

但 Tool Integration 需要额外支持：

```text
Tool Schema
Tool Call
Tool Result
```

所以这一轮明确引入：

```ts
ToolCapableProvider
```

而不是让 `MiniCodingAgent` 自己知道 HTTP、URL、API Key 和 Provider JSON 细节。

```text
MiniCodingAgent
↓
ToolCapableProvider
↓
Provider API
```

---

## 为什么只允许一次 read_file？

这一轮故意限制：

```text
Model Turn 1
→ final answer
或
→ read_file

如果 read_file：
↓
Tool Result
↓
Model Turn 2
→ final answer
```

第二轮不再提供 Tool Schema。

所以这里还不是完整 Agent Loop。

目的只是验证：

> **模型可以发现自己缺少信息，主动读取一次真实文件，再基于 Tool Result 回答。**

多次读文件、多 Tool、多 Step 留给后面的 Multi-Step Coding Loop。

---

## 这一轮复用了什么？

```text
05 Context Runtime
02 Tool · Unified Tool Interface
read_file Tool
```

`read_file` 仍然使用之前已经验证过的 Tool 实现：

```text
relative path
↓
resolve
↓
workspace boundary check
↓
read UTF-8 file
```

Integration 不重新发明 Tool。

---

## 当前明确不做

```text
write_file
Permission
run_test
多个 Tool Call
无限 Agent Loop
Session 持久化
Compaction
Recovery
```

特别是：

```text
读取文件
≠
可以修改文件
```

一旦进入写操作，就必须面对 Permission。

所以留给：

```text
integration:03 · Read → Edit → Permission → Write
```

---

## 这轮要记住

```text
integration:01
= Skeleton

integration:02
= Inspect
```

最重要的一句话：

> **Coding Agent 不应该把不知道的项目事实交给模型猜，而应该让模型通过 Tool 获取真实证据。**

---

## Done 标准

- [ ] 我知道 Project Context 不应该提前塞入所有文件内容。
- [ ] 我能解释为什么模型需要 `read_file` 才能知道项目真实状态。
- [ ] 我知道 Tool Call 是模型提出请求，真正读文件的是 Runtime。
- [ ] 我知道 Tool Result 必须重新返回模型，模型才能基于真实结果回答。
- [ ] 我知道当前为什么只允许一次读取。
- [ ] 我知道读操作和写操作的风险边界不同。
- [ ] 我知道 `01 = Skeleton`，`02 = Inspect`。
- [ ] 我知道下一步为什么进入 Permission + write_file。
