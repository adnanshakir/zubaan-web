"use client"

import type { ReactNode } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { NavIsland } from "@/components/nav-island"

export default function AppClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <main className="mx-auto w-full max-w-md px-5 py-8 pb-28">{children}</main>
      <NavIsland />
    </AuthGuard>
  )
}
