"use client"

import { useSyncExternalStore } from "react"
import { getUserId } from "@/lib/api/client"

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange)
  return () => window.removeEventListener("storage", onChange)
}

/** undefined while hydrating, null when signed out, a string when signed in. */
export function useUserId(): string | null | undefined {
  return useSyncExternalStore<string | null | undefined>(subscribe, getUserId, () => undefined)
}
