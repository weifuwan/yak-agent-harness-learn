export type RecoveryStep = {
  name: string
  execute(): Promise<void>
}

export async function runWithoutRecovery(
  steps: RecoveryStep[],
): Promise<void> {
  for (const step of steps) {
    console.log(`running step       : ${step.name}`)

    // recovery:01 的故意缺陷：
    // 这里只是按顺序执行。
    // 一旦某一步抛错，整个 Run 直接结束。
    // 没有 Retry、Run State、Checkpoint、Resume、Rollback。
    await step.execute()
  }
}
