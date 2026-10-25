"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AudioLinesIcon, BookOpenIcon, HouseIcon, SpellCheckIcon } from "lucide-react"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/home", label: "Home", icon: HouseIcon },
  { href: "/lessons", label: "Lessons", icon: BookOpenIcon },
  { href: "/mistakes", label: "Mistakes", icon: SpellCheckIcon },
  { href: "/voice-lab", label: "Voice lab", icon: AudioLinesIcon },
] as const

export function NavIsland() {
  const pathname = usePathname()
  const activeIndex = ITEMS.findIndex((item) => pathname.startsWith(item.href))

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-40 w-[min(22rem,calc(100%-2.5rem))] -translate-x-1/2 rounded-full border border-border bg-card/80 p-1 backdrop-blur-md"
    >
      <div className="relative grid grid-cols-4">
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 w-1/4 rounded-full bg-accent transition-[transform,opacity] duration-200 ease-[var(--ease-out-soft)] motion-reduce:transition-none",
            activeIndex === -1 && "opacity-0",
          )}
          style={{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }}
        />
        {ITEMS.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => haptic.tap()}
            aria-current={index === activeIndex ? "page" : undefined}
            className={cn(
              "relative z-10 flex flex-col items-center gap-0.5 rounded-full py-2 text-[11px] font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              index === activeIndex
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
