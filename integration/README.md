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
01 Agent Skeleton                    ← 当前
02 Read → Think → Answer             ← 后续
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

当前没有 Tool，所以它还不会读文件、改文件或跑测试。

```text
01 = Skeleton
```

详细：[`01-agent-skeleton/README.md`](./01-agent-skeleton/README.md)

---

## 为什么下一步是 Read → Think → Answer？

当前 Agent 的项目知识来自预先注入的 Project Context。

但真实 Coding Agent 应该能面对：

```text
“package.json 里的 Node 版本是多少？”
```

然后自己：

```text
read_file(package.json)
↓
得到真实文件内容
↓
LLM 根据 Tool Result 回答
```

所以下一轮进入：

```text
integration:02 · Read → Think → Answer
```

第一次把 Tool + Agent Loop 接进 Integration。

---

## 当前 Done 标准

### Integration 01

- [ ] 我知道 Integration 不是重新实现 8 个 MVP，而是组合已经理解的能力。
- [ ] 我能解释 `MiniCodingAgent` 为什么是统一入口。
- [ ] 我知道 Context Runtime 负责组装模型输入，Agent 负责流程编排。
- [ ] 我知道 Provider 细节不应该泄漏进 Agent 主流程。
- [ ] 我知道没有 Tool 时不能假装读取真实文件。
- [ ] 我知道 `01 = Skeleton`。
- [ ] 我知道下一步为什么要接 `read_file`。

做到这些，就进入 **integration:02 · Read → Think → Answer**。
