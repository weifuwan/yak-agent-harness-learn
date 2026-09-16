# 02 · Message Roles

> 核心问题：**为什么要把“你是谁”和“用户这次要什么”分开？**

## 从 01 到 02，只增加一个东西

01：

```text
User → Model → Assistant
```

02：

```text
System
   +
User
   ↓
Model
   ↓
Assistant
```

## 三种基础角色

### system

描述模型的角色、规则和回答方式。

例如：

```text
你是一个专业的 Java 编程助手。回答简洁，优先使用初学者能理解的语言。
```

### user

用户当前这一轮真正提出的问题。

例如：

```text
解释一下 HashMap。
```

### assistant

模型生成的回答。

当前阶段我们只从响应里读取 Assistant，还没有把它重新放进下一轮请求。多轮对话放到 03 再学。

## 最值得做的实验

保持 User Prompt 不变，只改 System Prompt：

```text
你是一个 Java 专家
```

改成：

```text
你是一个给 10 岁孩子讲编程的老师
```

观察输出有什么变化。

这能直观看出：

```text
System = 长期行为约束
User   = 当前任务
```

## 运行

```bash
npm run llm:02 -- "解释一下 HashMap"
```

然后修改 `index.ts` 里的 `SYSTEM_PROMPT` 再运行一次。
