# 03 · Onlook · Visual Editing

状态：`PLANNED`

参考项目：`onlook-dev/onlook`

> 核心问题：**生成出来的 React 页面，怎样让用户直接在 Preview 中选中元素、修改视觉属性，并把变化精确写回源码？**

## 学习路线

```text
01 No Visual Editing
   ↓
02 Element Selection
   ↓
03 DOM → Source Mapping
   ↓
04 Style / Token Editing
   ↓
05 Code Writeback
   ↓
06 Preview Sync
   ↓
07 Minimal Visual Editor
```

对应目录：

```text
03-onlook/
├── 01-no-visual-editing/
├── 02-element-selection/
├── 03-dom-source-mapping/
├── 04-style-token-editing/
├── 05-code-writeback/
├── 06-preview-sync/
└── 07-minimal-visual-editor/
```

## 源码对照重点

```text
packages/parser/src/ids.ts       → 元素 / 源码身份
packages/parser/src/template-node → Source Node
packages/parser/src/code-edit/    → 代码回写
packages/penpal/                  → Preview 通信
packages/fonts/                   → 字体等视觉资产
apps/web                          → Visual Editor 产品层
```

主链：

```text
React Source
↓
Preview DOM
↓ click
Selected Element
↓
DOM ↔ Source Mapping
↓
Visual Edit
↓
Code Writeback
↓
Preview Sync
```

与 Yakable 的关系：

> OpenUI 解决“怎样受控地生成 UI”，Onlook 解决“生成出来以后怎样直接在视觉界面中继续编辑”。

当前不进入实现，等待 OpenUI Frontend Harness 阶段完成。
