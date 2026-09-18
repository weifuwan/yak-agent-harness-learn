# 03 · Decision Drift

状态：COMPLETE

所属章节：No UI Harness

## 核心问题

前两节已经确认：

~~~text
01
Model 会主动补齐前端决策

02
重新生成时，Model 可以重新做决定
~~~

这一节继续问：

> 到底哪些前端决策在漂？

## 实验

同一个业务目标、同一个 Model，独立生成 3 次。

为了让结果可以逐项比较，只固定 Decision Sheet 的字段：

~~~text
framework
uiLibrary
styling
stateManagement
router
font
primaryColor
cardRadius
navigation
pageLayout
pages
coreComponents
directoryStructure
dependencies
~~~

不固定这些字段的答案。

所以：

> 固定实验数据格式，不等于固定前端决策，也不等于 Frontend Harness。

## 运行

~~~bash
npm run openui:01:03
~~~

程序会输出：

~~~text
Run 1 / 2 / 3

Decision Drift Comparison

Per-Run Values

drift decisions : X / 14
~~~

例如：

~~~text
framework      2/3  DRIFT
font           1/3  STABLE_THIS_RUN
navigation     2/3  DRIFT
~~~

含义：

~~~text
2/3
= 3 次生成出现 2 种结果

1/3
= 当前 3 次结果恰好一致
~~~

注意：

> STABLE_THIS_RUN 不代表这个决定已经成为系统规则。

## 与 04 的边界

这一节只研究：

~~~text
Decision Drift
= 决策内容发生变化
~~~

如果模型连 JSON / 字段结构都没有按约定返回，那是：

~~~text
Schema Drift
~~~

留到 04 单独研究。

## Done

跑完后能回答：

- [x] 为什么要把前端决定结构化？
- [x] 哪些 decision 在当前 3 个样本里发生 Drift？
- [x] 哪些 decision 当前相对稳定？
- [x] 为什么 STABLE_THIS_RUN 不能说明它已经成为 Harness 规则？
- [x] 我能区分 Decision Drift 和 Schema Drift。

下一节：

~~~text
04 · Schema Drift
~~~
