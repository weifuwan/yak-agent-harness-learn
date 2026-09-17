# Recovery 04 · Checkpoint / Snapshot

> 核心问题：**Run State 已经知道哪里失败，但如果前面的 Step 修改了文件，修改前的世界是什么样？**

运行：

```bash
npm run recovery:04
```

---

## 从上一轮开始

`recovery:03` 已经能记录：

```text
Step 1 success
Step 2 success
Step 3 failed
Step 4 pending
```

但它只能说明：

```text
发生过什么
```

不能回答：

```text
Step 1 / Step 2 修改文件之前，文件原来是什么？
```

所以这一轮第一次引入：

```text
Checkpoint / Snapshot
```

---

## 最小设计

当前只保存文件内容快照：

```ts
RecoveryCheckpoint
├── id
└── files[]
    ├── path
    └── content
```

创建：

```ts
const checkpoint = await createCheckpoint(
  "checkpoint-01",
  [aPath, bPath],
)
```

它发生在副作用之前：

```text
Current Files
↓
Create Checkpoint
↓
Execute Steps
↓
Failure
```

---

## 默认实验

初始：

```text
A.txt = OLD-A
B.txt = OLD-B
```

先创建 Snapshot：

```text
Snapshot A = OLD-A
Snapshot B = OLD-B
```

然后执行：

```text
Step 1
A.txt = NEW-A
→ success

Step 2
B.txt = NEW-B
→ success

Step 3
→ failed

Step 4
→ pending
```

失败以后：

```text
Current A  = NEW-A
Current B  = NEW-B

Snapshot A = OLD-A
Snapshot B = OLD-B
```

这说明 Snapshot 没有随着 Current State 改变。

---

## Run State 和 Snapshot 的区别

```text
Run State
= 我执行到哪了
```

```text
Snapshot
= 当时世界是什么样
```

所以：

```text
Run State
→ 恢复流程判断

Snapshot
→ 恢复数据材料
```

两者缺一不可。

---

## 为什么这一轮不 Rollback？

这一轮只验证：

```text
我已经拥有恢复材料
```

但故意不做：

```text
Snapshot
↓
Restore Files
```

所以运行结束前，文件仍然保持：

```text
A = NEW-A
B = NEW-B
```

真正恢复留给：

```text
recovery:05 · Resume / Rollback
```

---

## 当前限制

当前 Snapshot 只是学习版：

```text
只保存指定文件内容
不处理新建文件
不处理删除文件
不处理目录
不处理权限 / metadata
不持久化到磁盘
不做 Git snapshot
不做事务
```

这些都不是这一轮的重点。

---

## 这一轮记住

```text
01 = Failure
02 = Retry
03 = State
04 = Checkpoint
```

一句话：

> **Run State 记录执行过程，Checkpoint / Snapshot 保存恢复所需的旧世界状态。**
