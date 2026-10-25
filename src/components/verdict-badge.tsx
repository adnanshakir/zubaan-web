import { CheckIcon, CircleDotIcon, XIcon } from "lucide-react"
import type { Verdict } from "@/lib/speech-match"
import { Badge } from "@/components/ui/badge"

const VERDICTS = {
  said: {
    icon: CheckIcon,
    label: "Said it right",
    className: "border-emerald-400/30 text-emerald-400",
  },
  close: {
    icon: CircleDotIcon,
    label: "Almost",
    className: "border-amber-400/30 text-amber-400",
  },
  missed: {
    icon: XIcon,
    label: "Try again",
    className: "border-rose-400/30 text-rose-400",
  },
} as const

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const result = VERDICTS[verdict]
  const Icon = result.icon
  return (
    <Badge variant="outline" className={result.className}>
      <Icon className="size-3.5" />
      {result.label}
    </Badge>
  )
}
