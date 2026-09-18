# 01 · Single Generation · Results

## 实验条件

```text
Provider : DeepSeek
Model    : deepseek-flash
Prompt   : 帮我做一个数据同步系统的前端
Harness  : None
Runs     : 1
```

## 数据

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

## 结论

> 用户只提供业务目标时，模型会主动补齐大量产品、设计和工程决策。

没有 Harness，不代表没有规则，而是这些规则临时由 Model 决定。
