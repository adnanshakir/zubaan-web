"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { NavIsland } from "@/components/nav-island"
import { useUserId } from "@/hooks/use-user-id"

export default function AppLayout({ children }: { children: ReactNode }) {
  const userId = useUserId()
  const router = useRouter()

  useEffect(() => {
    if (userId === null) router.replace("/onboarding")
  }, [router, userId])

  if (!userId) return <main className="mx-auto w-full max-w-md px-5 py-8" />

  return (
    <>
      <main className="mx-auto w-full max-w-md px-5 py-8 pb-28">{children}</main>
      <NavIsland />
    </>
  )
}
