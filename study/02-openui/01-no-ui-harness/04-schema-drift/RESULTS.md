# 04 · Schema Drift · Results

## 实验条件

```text
Provider : DeepSeek
Model    : deepseek-flash
Prompt   : 固定业务目标 + 明确 JSON Schema 要求
Harness  : None
Runs     : 5
```

Prompt 明确规定：

```text
framework = { name:string, version:string }
9 个 scalar fields = string
4 个 list fields = string[]
顶层必须且只能有 14 个字段
```

这里只使用自然语言 Prompt，没有使用 Runtime Schema Enforcement。

## 当前实验数据

```text
Parseable JSON        : 5 / 5
Schema Violation Runs : 0 / 5
Schema Drift Fields   : 0 / 14
```

5 次运行中，14 个字段的 Shape 都保持一致：

```text
framework
→ object{name:string,version:string}

uiLibrary / styling / stateManagement / router /
font / primaryColor / cardRadius / navigation / pageLayout
→ string

pages / coreComponents / directoryStructure / dependencies
→ array<string>
```

## 历史观察

曾经做过约 10000 次类似重复测试，观察到过至少 1 次结构不符合预期。

这说明：

```text
当前 5 次全部匹配
≠
Prompt 能保证 Schema 永远正确
```

## 结论

> 明确、具体的 Prompt，可以显著提高输出 Schema 的稳定性。

但：

> Prompt Compliance 不等于 Runtime Enforcement。

也就是：

```text
Prompt
= 告诉 Model “应该这样输出”

Runtime Constraint
= 系统保证 “不能不这样输出”
```

本节不需要继续扩大样本量去估算错误概率。

学习目标只是确认这条边界：

> Prompt 解决“尽量遵守”，Runtime Constraint 解决“必须遵守”。
