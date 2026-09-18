# 02 · OpenUI · Frontend Harness

状态：`CURRENT`

参考项目：`thesysdev/openui`

目标不是复刻 OpenUI，而是借它理解：

> 如何让模型在受控的组件、语言、Runtime 和 Renderer 中生成稳定 UI？

## 学习方式

和前面的 Agent 学习保持一致：

```text
大章节
↓
拆成若干小 MVP
↓
一个问题一个问题撞边界
↓
最后收口成 Minimal Runtime / Minimal Harness
```

7 个一级目录是 Chapter，不是 7 次学习。

## 总路线

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

## 目录计划

```text
study/02-openui/
├── 01-no-ui-harness/
│   ├── 01-single-generation/
│   ├── 02-repeat-same-prompt/
│   ├── 03-decision-drift/
│   ├── 04-schema-drift/
│   └── 05-no-harness-observation/
├── 02-component-library/
│   ├── 01-raw-component-names/
│   ├── 02-component-metadata/
│   ├── 03-props-schema/
│   ├── 04-component-reference/
│   ├── 05-component-groups/
│   └── 06-minimal-component-library/
├── 03-library-to-prompt/
│   ├── 01-manual-component-prompt/
│   ├── 02-component-signature/
│   ├── 03-description-injection/
│   ├── 04-group-rules/
│   ├── 05-examples/
│   ├── 06-prompt-spec/
│   └── 07-minimal-prompt-generator/
├── 04-ui-language-parser/
│   ├── 01-why-not-raw-jsx/
│   ├── 02-minimal-ui-language/
│   ├── 03-tokenize/
│   ├── 04-parse-ast/
│   ├── 05-component-validation/
│   ├── 06-partial-invalid-output/
│   └── 07-minimal-parser/
├── 05-runtime/
│   ├── 01-static-ast/
│   ├── 02-references/
│   ├── 03-variables/
│   ├── 04-expressions/
│   ├── 05-builtins/
│   ├── 06-actions-bindings/
│   └── 07-minimal-runtime/
├── 06-renderer-design-system/
│   ├── 01-ast-to-component/
│   ├── 02-component-renderer/
│   ├── 03-nested-rendering/
│   ├── 04-design-tokens/
│   ├── 05-swap-design-system/
│   ├── 06-semantic-visual-separation/
│   └── 07-minimal-renderer/
├── 07-minimal-frontend-harness/
│   ├── 01-harness-skeleton/
│   ├── 02-library-prompt/
│   ├── 03-llm-to-program/
│   ├── 04-program-to-runtime/
│   ├── 05-runtime-to-renderer/
│   ├── 06-end-to-end-validation/
│   └── 07-minimal-frontend-harness/
```

## 每章重点

### 01 · No UI Harness

```text
Single Generation
→ Repeat Same Prompt
→ Decision Drift
→ Schema Drift
→ Observation
```

只证明：没有 Harness 时，关键前端决策的 owner 是 Model。

当前 `01-no-ui-harness/index.ts` 先保留，它是已写好的综合实验；后面再按 5 个小节点拆，不在这次目录调整中移动代码。

### 02 · Component Library

```text
Raw Names
→ Metadata
→ Props Schema
→ Component Reference
→ Groups
→ Minimal Library
```

目标：理解 OpenUI 的 Component Library 为什么不只是组件名列表。

### 03 · Library → Prompt

```text
Manual Prompt
→ Signature
→ Description
→ Groups / Rules
→ Examples
→ PromptSpec
→ Minimal Prompt Generator
```

目标：理解真实组件怎样变成模型可理解、可约束的能力描述。

### 04 · UI Language / Parser

```text
Why Not Raw JSX
→ Minimal UI Language
→ Tokenize
→ AST
→ Validation
→ Partial / Invalid Output
→ Minimal Parser
```

目标：理解为什么模型输出与最终 React 之间需要受控中间语言。

### 05 · Runtime

```text
Static AST
→ References
→ Variables
→ Expressions
→ Built-ins
→ Actions / Bindings
→ Minimal Runtime
```

目标：让解析后的 UI 结构从静态描述变成可执行模型。

### 06 · Renderer / Design System

```text
AST → Component
→ Component Renderer
→ Nested Rendering
→ Design Tokens
→ Swap Design System
→ Semantic / Visual Separation
→ Minimal Renderer
```

目标：把“页面语义”与“视觉实现”真正分开。

### 07 · Minimal Frontend Harness

```text
Harness Skeleton
→ Library + Prompt
→ LLM → UI Program
→ Program → Runtime
→ Runtime → Renderer
→ End-to-End Validation
→ Minimal Frontend Harness
```

最终形成：

```text
User Prompt
↓
Component Library
↓
Prompt Generator
↓
LLM
↓
UI Program
↓
Parser
↓
Runtime
↓
Renderer
↓
UI
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

每一个小 MVP：

```text
① 它处在整个流程什么位置？
② 如果没有它，会出现什么问题？
③ OpenUI 用什么思路解决？
④ 暂时不抄源码，自己设计最小方案
⑤ 做 100～300 行左右 MVP
⑥ 跑场景验证理解
⑦ 再回头看 OpenUI
⑧ 对比：我的方案 vs OpenUI
⑨ 判断复杂度为什么出现
```

原则：

> 没遇到问题之前，不提前引入答案。

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

当前只推进 `01-no-ui-harness`，其余目录只是学习边界。
