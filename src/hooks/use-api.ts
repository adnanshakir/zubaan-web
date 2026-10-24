"use client"

import { useCallback, useEffect, useState } from "react"
import { ApiError, clearUserId } from "@/lib/api/client"

interface ApiState<T> {
  data: T | null
  error: unknown
  loading: boolean
}

/** Loads data once on mount. `load` must have a stable identity: pass a
 *  function from `api` directly, or wrap it in useCallback. */
export function useApi<T>(load: () => Promise<T>) {
  const [state, setState] = useState<ApiState<T>>({ data: null, error: null, loading: true })

  const run = useCallback(() => {
    let cancelled = false
    load().then(
      (data) => {
        if (!cancelled) setState({ data, error: null, loading: false })
      },
      (error: unknown) => {
        if (error instanceof ApiError && error.status === 401) clearUserId()
        if (!cancelled) setState({ data: null, error, loading: false })
      },
    )
    return () => {
      cancelled = true
    }
  }, [load])

  useEffect(() => run(), [run])

  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, error: null, loading: true }))
    run()
  }, [run])

  return { ...state, reload }
}
