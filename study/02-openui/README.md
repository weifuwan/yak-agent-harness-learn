# 02 · OpenUI · Frontend Harness

状态：`CURRENT`

参考项目：`thesysdev/openui`

目标不是复刻 OpenUI，而是借它理解：

> 如何让模型在受控的组件、语言、Runtime 和 Renderer 中生成稳定 UI？

## 学习路线

```text
01 No UI Harness
   ↓
02 Component Library
   ↓
03 Library → Prompt
   ↓
04 UI Language / Parser
   ↓
05 Runtime
   ↓
06 Renderer / Design System
   ↓
07 Minimal Frontend Harness
```

记忆：

```text
01 = Problem
02 = Library
03 = Prompt
04 = Parse
05 = Runtime
06 = Render
07 = Harness
```

## 与 OpenUI 源码的对应关系

```text
packages/lang-core/src/library.ts
→ Component Library

packages/lang-core/src/parser/prompt.ts
→ Library → Prompt

packages/lang-core/src/parser/
→ UI Language / Parser

packages/lang-core/src/runtime/
→ Runtime

packages/react-lang/src/Renderer.tsx
packages/react-lang/src/library.ts
→ Renderer / React Library

examples/design-systems/
→ Design System

examples/harnesses/
→ 完整 Harness 对照
```

## 固定学习方法

每一节都走：

```text
问题
↓
边界
↓
自己的最小设计
↓
MVP
↓
场景验证
↓
OpenUI 源码
↓
对比差异
↓
判断哪些复杂度值得进入 Yakable
```

## 当前进度

```text
[>] 01 No UI Harness
[ ] 02 Component Library
[ ] 03 Library → Prompt
[ ] 04 UI Language / Parser
[ ] 05 Runtime
[ ] 06 Renderer / Design System
[ ] 07 Minimal Frontend Harness
```

这一阶段暂时不做：

```text
Visual Editor
完整 AI App Builder
复杂 Coding Runtime
Backend Harness
商业化能力
```

这些分别留给 Onlook、Dyad、Codex 和后续 Yakable 产品阶段。
