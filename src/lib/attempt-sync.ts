import type { AttemptResultRequest } from "@/lib/api/types"
import { api } from "@/lib/api/client"

export function createAttemptSync(attemptId: string) {
  let tail = Promise.resolve()

  function record(payload: AttemptResultRequest): void {
    tail = tail
      .then(() => api.recordResult(attemptId, payload))
      .catch((error: unknown) => {
        console.warn("Could not sync lesson attempt result", error)
      })
  }

  return {
    record,
    flush: () => tail,
  }
}
