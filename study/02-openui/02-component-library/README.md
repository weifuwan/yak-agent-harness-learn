# 02 · Component Library

> 核心问题：**为什么不能让模型每次都自己发明 Button、Card、Table？**

状态：`CURRENT`

这一章只建立一个最小组件库，不碰 Parser 和 Runtime。

学习路线：

```text
01 Raw Component Names
→ 02 Component Metadata
→ 03 Props Schema
→ 04 Component Reference
→ 05 Component Groups
→ 06 Minimal Component Library
```

当前进入下一小节：

> **知道组件允许怎么配置之后，系统还需要知道它最终对应哪个真实实现。**

## 当前进度

```text
[x] 01 Raw Component Names
[x] 02 Component Metadata
[x] 03 Props Schema
[>] 04 Component Reference
[ ] 05 Component Groups
[ ] 06 Minimal Component Library
```

OpenUI 对照：

```text
packages/lang-core/src/library.ts
packages/react-lang/src/library.ts
```

这一章最终要理解：

```text
真实组件
↓
组件元数据
↓
Props Schema
↓
Runtime Reference
↓
模型可选择 + 系统可验证的能力集合
```

Done：能解释 Component Library 与普通 React 组件目录的区别。
