export type RetryOptions = {
  maxAttempts: number
}

export type RetrySuccess<T> = {
  status: "success"
  attempts: number
  value: T
}

export type RetryFailure = {
  status: "failed"
  attempts: number
  error: Error
}

export type RetryResult<T> = RetrySuccess<T> | RetryFailure

export async function retryOperation<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<RetryResult<T>> {
  if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1) {
    throw new Error(
      `maxAttempts must be a positive integer, received: ${options.maxAttempts}`,
    )
  }

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      const value = await operation(attempt)

      return {
        status: "success",
        attempts: attempt,
        value,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  return {
    status: "failed",
    attempts: options.maxAttempts,
    error: lastError ?? new Error("operation failed without an error"),
  }
}
