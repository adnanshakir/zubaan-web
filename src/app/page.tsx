"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserId } from "@/hooks/use-user-id"

export default function IndexPage() {
  const userId = useUserId()
  const router = useRouter()

  useEffect(() => {
    if (userId !== undefined) router.replace(userId ? "/home" : "/onboarding")
  }, [router, userId])

  return null
}
