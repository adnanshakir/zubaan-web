"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserId } from "@/hooks/use-user-id"

export function AuthGuard({ children }: { children: ReactNode }) {
  const userId = useUserId()
  const router = useRouter()

  useEffect(() => {
    if (userId === null) router.replace("/onboarding")
  }, [router, userId])

  if (!userId) return <div className="min-h-dvh" />

  return children
}
