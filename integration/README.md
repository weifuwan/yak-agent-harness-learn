# Integration · Mini Coding Agent

> 核心问题：**前面 8 个能力都单独理解以后，怎么一步步把它们组合成一个真正能工作的 Coding Agent？**

当前状态：`LEARNING`

Integration 仍然沿用同一个原则：

```text
理解一个组合问题
↓
只接必要模块
↓
验证边界
↓
封板
↓
再接下一层
```

---

## 学习路线

```text
01 Agent Skeleton
   ↓
02 Read → Think → Answer
   ↓
03 Read → Edit → Permission → Write
   ↓
04 Multi-Step Coding Loop
   ↓
05 Session / Context / Recovery
   ↓
06 Minimal Coding Agent Runtime
```

当前进度：

```text
01 Agent Skeleton                    ✅
02 Read → Think → Answer             ← 当前
03 Read → Edit → Permission → Write  ← 后续
04 Multi-Step Coding Loop            ← 后续
05 Session / Context / Recovery      ← 后续
06 Minimal Coding Agent Runtime      ← 后续
```

---

# 01 · Agent Skeleton

运行：

```bash
npm run integration:01
```

只接：

```text
User Prompt
↓
MiniCodingAgent
↓
Context Runtime
↓
LLM Provider
↓
Answer
```

```text
01 = Skeleton
```

详细：[`01-agent-skeleton/README.md`](./01-agent-skeleton/README.md)

---

# 02 · Read → Think → Answer

核心问题：

> **Agent 不知道项目里的真实信息时，能不能自己读取文件，而不是靠模型猜？**

运行：

```bash
npm run integration:02
```

默认实验：

```text
User:
“请读取 package.json，只告诉我 engines.node 的值。”

↓

LLM
↓
read_file(package.json)
↓
Tool Result
↓
LLM
↓
Answer
```

这一轮复用：

```text
Context Runtime
+
Unified Tool Interface
+
read_file
```

同时暴露了 Integration 的第一个真实接口问题：

```text
普通 Provider.chat()
只支持文本消息

Tool Integration
还需要 Tool Schema / Tool Call / Tool Result
```

所以这一轮明确增加 `ToolCapableProvider` 边界，而不是让 Agent 主流程直接处理 Provider HTTP 细节。

### 为什么只允许一次读取？

当前故意限制：

```text
Model Turn 1
→ read_file

Tool Result
↓
Model Turn 2
→ final answer
```

还不允许多个 Tool Round。

因为多次读取、多步骤修改、测试失败再修改属于：

```text
integration:04 · Multi-Step Coding Loop
```

```text
02 = Inspect
```

详细：[`02-read-think-answer/README.md`](./02-read-think-answer/README.md)

---

## 为什么下一步是 Read → Edit → Permission → Write？

现在 Agent 已经能：

```text
读真实文件
↓
根据真实内容回答
```

但还不能：

```text
修改文件
```

一旦允许 `write_file`，问题就不再只是 Tool 能力，而是：

```text
模型想写
↓
到底能不能写？
↓
Permission Runtime
↓
allow / ask / deny
```

所以下一轮进入：

```text
integration:03 · Read → Edit → Permission → Write
```

---

## 当前明确不进入

```text
write_file
run_test
多个 Tool Call Round
Session 持久化
Compaction
Recovery
完整 Coding Agent Runtime
```

---

## 当前 Done 标准

### Integration 02

- [ ] 我知道 Coding Agent 不应该猜项目文件里的事实。
- [ ] 我知道模型只负责提出 Tool Call，Runtime 才真正执行 read_file。
- [ ] 我知道 Tool Result 必须重新回到模型。
- [ ] 我知道 Project Context 不等于真实项目文件内容。
- [ ] 我知道为什么 Tool-capable Provider 比普通 Provider 多一层协议能力。
- [ ] 我知道当前为什么只允许一次 read_file。
- [ ] 我知道 `01 = Skeleton`，`02 = Inspect`。
- [ ] 我知道下一步为什么必须引入 Permission 后才能写文件。

做到这些，就进入 **integration:03 · Read → Edit → Permission → Write**。
