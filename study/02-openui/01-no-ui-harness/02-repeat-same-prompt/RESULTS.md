# 02 · Repeat Same Prompt · Results

## 实验条件

```text
Provider : DeepSeek
Model    : deepseek-flash
Prompt   : 帮我做一个数据同步系统的前端
Harness  : None
Runs     : 2
History  : 两个 Run 完全独立，不共享上下文
```

## 对比

| 维度 | Run 1 | Run 2 |
| --- | --- | --- |
| 技术方案 | 原生 HTML + CSS + JavaScript | React 18 + Tailwind CSS + Babel |
| CSS 方案 | 手写 CSS + CSS Variables | Tailwind Utility Classes |
| 主体视觉 | 深色 Dashboard | 浅色内容区 + 深色 Sidebar |
| 状态方式 | 普通 JS state 对象 | React useState / useEffect |
| 核心页面 | 概览 / 数据源 / 同步任务 / 运行日志 / 设置 | 概览 / 数据源 / 同步任务 / 运行日志 |
| Prompt | 相同 | 相同 |
| Model | 相同 | 相同 |

## 数据

```text
Generation 次数       : 2
技术方案种类          : 2 / 2
视觉方案种类          : 2 / 2
核心页面数量          : 5 vs 4
Prompt 是否变化       : No
Model 是否变化        : No
Run 是否共享上下文    : No
```

## 结论

> 当规则属于 Model，重新生成就等于重新做一次决定。

当前样本里，业务语义相对稳定，但工程实现和视觉方案已经明显漂移。
