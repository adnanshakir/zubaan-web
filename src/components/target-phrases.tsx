"use client"

import { useMemo, useState } from "react"
import { CheckIcon, ChevronDownIcon, CircleDotIcon, CircleIcon, XIcon } from "lucide-react"
import { phraseStatus, type PhraseStatus } from "@/lib/phrase-status"
import { Button } from "@/components/ui/button"

interface TargetPhrasesProps {
  phrases: readonly string[]
  spoken: readonly string[]
  ended: boolean
}

const STATUS_STYLES: Record<PhraseStatus, string> = {
  said: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  close: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  none: "border-border text-muted-foreground",
}

export function TargetPhrases({ phrases, spoken, ended }: TargetPhrasesProps) {
  const [open, setOpen] = useState(true)
  const statuses = useMemo(
    () => phrases.map((phrase) => phraseStatus(phrase, spoken)),
    [phrases, spoken],
  )
  const said = statuses.filter((status) => status === "said").length

  if (!phrases.length) return null

  return (
    <div className="flex flex-col gap-2 px-5 pb-3">
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        Phrases to try ({said}/{phrases.length})
        <ChevronDownIcon className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      {open ? (
        <div className="flex flex-col gap-2">
          {phrases.map((phrase, index) => {
            const status = statuses[index]
            const Icon =
              status === "said"
                ? CheckIcon
                : status === "close"
                  ? CircleDotIcon
                  : ended
                    ? XIcon
                    : CircleIcon
            const className =
              status === "none" && ended
                ? STATUS_STYLES.none.replace(
                    "border-border text-muted-foreground",
                    "border-rose-400/30 bg-rose-400/10 text-rose-400",
                  )
                : STATUS_STYLES[status]
            return (
              <div
                key={`${phrase}-${index}`}
                className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm ${className}`}
              >
                <Icon className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 break-words">{phrase}</span>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
