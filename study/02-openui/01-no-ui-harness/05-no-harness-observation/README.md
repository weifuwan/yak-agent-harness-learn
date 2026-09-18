# 05 · No Harness Observation

状态：`IMPLEMENTED · WAITING FOR RUN`

所属章节：`No UI Harness`

## 核心问题

这一节不再做新的 LLM 实验。

只把前四节收口成一个问题：

> **没有 Frontend Harness 时，前端决策权到底在哪里？**

---

## ① 前四节已经观察到了什么？

```text
01 Single Generation
→ Model 会主动补齐用户没说的前端决定

02 Repeat Same Prompt
→ 重新生成时，Model 可以重新选择

03 Decision Drift
→ 当前样本中，多数被观察的前端决定出现 Drift

04 Schema Drift
→ 强 Prompt 可以提高结构稳定性
→ 但 Prompt Compliance ≠ Runtime Enforcement
```

这一节不重复证明这些结论。

只把它们放到同一张图里。

---

## ② 运行

```bash
npm run openui:01:05
```

这次不会调用模型。

程序只输出：

```text
Experiment Summary

Decision Ownership Map

Chapter Conclusion

Next Question
```

---

## ③ 什么叫 Decision Owner？

例如：

```text
技术栈
UI Library
Styling
颜色
字体
圆角
页面范围
组件集合
目录
依赖
```

如果系统没有提前规定，最终由模型每次临时选择：

```text
Decision Owner = Model
```

如果只是 Prompt 写：

```text
pages 必须 string[]
```

但 Runtime 不检查：

```text
Constraint Source = Prompt
Runtime Guarantee = No
```

这是这一章最需要分清楚的两个维度：

```text
谁决定？
谁保证？
```

---

## ④ No Harness 的真正问题

不要把这一章总结成：

> AI 很随机。

这个结论太粗。

更准确的是：

> **关键前端决策权和约束执行权仍然主要留在 Model，而不是系统。**

Model 可以表现得很稳定。

Prompt 也可以写得很严格。

但：

```text
Model 当前选择一致
≠
Product 已经拥有这个决定

Model 当前遵守 Prompt
≠
Runtime 已经保证这个约束
```

---

## ⑤ 到这里先不解决所有问题

这一节不讨论：

```text
怎样固定 Design Tokens
怎样限制 Props
怎样定义 UI Language
怎样做 Parser
怎样做 Runtime
怎样做 Renderer
```

只问：

> 如果只拿回第一小块确定性，应该先拿什么？

下一章从最简单的地方开始：

```text
02 · Component Library
```

先回答：

> **Model 到底允许使用哪些 UI 组件？**

---

## Done

运行后能自己解释：

- [ ] No Harness 的核心问题为什么不是“AI 一定会乱”？
- [ ] Decision Owner 和 Runtime Guarantee 有什么区别？
- [ ] 为什么 Prompt Constraint 仍然不是系统级 Constraint？
- [ ] 当前哪些前端决定主要还是 Model-owned？
- [ ] 为什么下一章先从 Component Library 开始，而不是直接做完整 Harness？

全部能解释后，`01 · No UI Harness` 章节完成。
