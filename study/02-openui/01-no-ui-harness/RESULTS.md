# No UI Harness · Experiment Results

记录 `npm run openui:01:01` 与 `npm run openui:01:02` 的实际结果。

## 实验条件

```text
Provider : DeepSeek
Model    : deepseek-flash
Prompt   : 帮我做一个数据同步系统的前端
Harness  : None
```

`openui:01:01`：生成 1 次。

`openui:01:02`：生成 2 次，两个 Run 完全独立，不共享历史。

> 这里只记录当前样本，不把 2～3 次运行结果当成概率统计。

---

## 01 · Single Generation

### 数据

```text
Prompt 数量        : 1
Generation 次数    : 1
用户明确技术栈     : 0
用户明确设计规则   : 0
用户明确页面结构   : 0
```

模型自行补出了：

```text
工程：单文件 HTML + CSS + JavaScript
视觉：深色主题、颜色、字体、圆角、Sidebar
产品：概览、同步任务、运行监控、数据源、同步日志、告警设置
业务：数据源类型、任务状态、同步模式、Cron、吞吐、成功率等
```

### 结论

> 用户只提供业务目标时，模型会主动补齐大量产品、设计和工程决策。

没有 Harness，不代表没有规则，而是这些规则临时由 Model 决定。

---

## 02 · Repeat Same Prompt

### 对比

| 维度 | Run 1 | Run 2 |
| --- | --- | --- |
| 技术方案 | 原生 HTML + CSS + JavaScript | React 18 + Tailwind CSS + Babel |
| CSS 方案 | 手写 CSS + CSS Variables | Tailwind Utility Classes |
| 主体视觉 | 深色 Dashboard | 浅色内容区 + 深色 Sidebar |
| 状态方式 | 普通 JS state 对象 | React useState / useEffect |
| 核心页面 | 概览 / 数据源 / 同步任务 / 运行日志 / 设置 | 概览 / 数据源 / 同步任务 / 运行日志 |
| Prompt | 相同 | 相同 |
| Model | 相同 | 相同 |

### 关键数据

```text
Generation 次数       : 2
技术方案种类          : 2 / 2
视觉方案种类          : 2 / 2
核心页面数量          : 5 vs 4
Prompt 是否变化       : No
Model 是否变化        : No
Run 是否共享上下文    : No
```

### 结论

> 当规则属于 Model，重新生成就等于重新做一次决定。

当前样本里，业务语义相对稳定，但工程实现和视觉方案已经明显漂移。

---

## 当前阶段结论

```text
01 证明：
Model 会主动补齐用户没有定义的前端决策。

02 证明：
这些决策在重新生成时可以被重新选择。
```

因此当前问题可以写成：

> **No Harness = Decision Owner is Model.**

下一步进入 `03-decision-drift`，把这些差异从“肉眼观察”升级成结构化比较。
