# 04 · Schema Drift

状态：`COMPLETE`

所属章节：`No UI Harness`

## 核心问题

> Prompt 明明明确规定了输出结构，这个结构本身可靠吗？

这一节不比较“选了 React 还是 Vue”，只比较结构：

```text
字段有没有丢
字段有没有多
字段类型有没有变
string[] 会不会变成 object[]
object 会不会变成 string
JSON 能不能正常解析
```

## 实验条件

同一个 Model、同一个 Prompt，独立运行 5 次。

Prompt 明确规定：

```text
framework = { name:string, version:string }
9 个 scalar fields = string
4 个 list fields = string[]
顶层必须且只能有 14 个字段
```

而且明确要求：

```text
不能增加字段
不能删除字段
不能改字段名
数组项必须全部是 string
```

但这里只使用自然语言 Prompt，没有使用：

```text
JSON Schema API
function calling
structured output
Runtime validator 去拒绝输出
```

所以仍然属于 No Harness 实验。

## 两个概念

```text
Schema Violation
= 某一次输出不符合期望 Schema

Schema Drift
= 多次 Run 之间，同一个字段的实际 Shape 发生变化
```

例如：

```text
Run 1 pages = string[]
Run 2 pages = object[]
Run 3 pages = string[]

=> pages 出现 Schema Drift
```

如果 5 次全部返回 object[]，而期望是 string[]：

```text
= Schema Violation
≠ Schema Drift
```

因为它虽然一直错，但 Shape 没有在 Run 之间漂。

## 运行

```bash
npm run openui:01:04
```

程序最终会输出两个核心数字：

```text
schema violation runs : X / 5
shape drift fields    : Y / 14
```

## 怎么理解结果

如果出现 Violation / Drift：

> 自然语言 Prompt 表达了期望，但没有把期望变成可靠的执行约束。

如果 5 次全部匹配：

> 只能说明当前 5 个样本都遵守了 Prompt，不能推出 Prompt 等价于 Runtime Schema Enforcement。

## Done

跑完后能回答：

- [x] Schema Violation 和 Schema Drift 有什么区别？
- [x] 为什么这次 Prompt 必须写得很明确？
- [x] 哪些字段发生了类型或 Shape 变化？
- [x] 为什么 Prompt Constraint 不等于 Runtime Constraint？
- [x] 即使 5 次都匹配，为什么仍不能说 Schema 已被系统保证？

下一节：

```text
05 · No Harness Observation
```
