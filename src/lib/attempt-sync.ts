import type { AttemptResultRequest } from "@/lib/api/types"
import { api } from "@/lib/api/client"

export function createAttemptSync(attemptId: string | Promise<string>) {
  let tail = Promise.resolve()
  let firstError: unknown = null
  let hasError = false

  function rememberError(error: unknown): void {
    if (!hasError) {
      firstError = error
      hasError = true
    }
  }

  function record(payload: AttemptResultRequest): void {
    tail = tail.then(async () => {
      try {
        await api.recordResult(await attemptId, payload)
      } catch (error: unknown) {
        rememberError(error)
        console.warn("Could not sync lesson attempt result", error)
      }
    })
  }

  return {
    record,
    flush: async () => {
      try {
        await attemptId
      } catch (error: unknown) {
        rememberError(error)
      }
      await tail
      if (hasError) throw firstError
    },
  }
}
