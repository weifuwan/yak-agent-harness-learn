# 03 · Decision Drift · Results

## 实验条件

```text
Provider : DeepSeek
Model    : deepseek-flash
Prompt   : 帮我做一个数据同步系统的前端
Harness  : None
Runs     : 3
```

三个 Run 使用同一个业务目标、同一个 Model、同一张 Decision Sheet，彼此独立。

## 数据

共观察 14 个前端决策维度：

```text
DRIFT             : 12 / 14
STABLE_THIS_RUN   :  2 / 14
```

当前 3 个样本里保持一致的只有：

```text
primaryColor = #1677ff
cardRadius   = 8px
```

其余 12 个维度都出现了字符串级漂移。

## 关键对比

| 维度 | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- |
| styling | Tailwind + Ant Design Token | CSS Modules + Ant Design Token | Tailwind + CSS Modules + Ant Design Token |
| stateManagement | Zustand 4.5 | Zustand | Zustand 4.5.5 |
| router | React Router 6.26 | React Router 6 | React Router 6.26.2 |
| pages | 9 个页面 | 10 个页面 | 12 个页面 |
| coreComponents | 12 个 | 16 个 | 37 个 |

目录结构和依赖集合也随 Run 发生明显变化。

## 观察

这次结果里有两种 Drift：

```text
表达/版本粒度 Drift
Ant Design 5.20
vs
Ant Design 5
vs
Ant Design 5.20.0

真正的工程决策 Drift
Tailwind
vs
CSS Modules
vs
Tailwind + CSS Modules
```

所以：

> String Drift 不一定等于 Semantic Drift。

但页面数量、组件数量、目录结构、依赖集合的变化，已经说明产品范围与工程复杂度也会被 Model 重新决定。

## 结论

> 没有 Harness 时，不只是 UI 会漂，连产品范围和工程复杂度都会被 Model 重新决定。

当前实验只说明：

```text
3 个样本中
12 / 14 个 decision observed drift
```

不能把它解释成“模型有 85.7% 的概率不稳定”。

下一节进入：

```text
04 · Schema Drift
```

研究：

> Prompt 明明要求同一个输出结构，为什么字段形态仍然会变化？
