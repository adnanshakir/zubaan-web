"use client"

import { CheckIcon, PencilLineIcon } from "lucide-react"
import type { ConversationFeedback } from "@/lib/api/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}:${String(remaining).padStart(2, "0")}`
}

export default function FeedbackSummary({ feedback }: { feedback: ConversationFeedback }) {
  const { used, missed } = feedback.targetPhrases

  return (
    <Card className="animate-in rounded-2xl shadow-none duration-200 fade-in-0 slide-in-from-bottom-1">
      <CardContent className="flex flex-col gap-5 px-5">
        <h2 className="text-lg font-medium">How it went</h2>
        <div className="grid grid-cols-3 gap-3">
          <Stat value={feedback.userTurns} label="turns" />
          <Stat value={feedback.mistakeCount} label="corrections" />
          <Stat value={`${used.length}/${used.length + missed.length}`} label="phrases used" />
        </div>
        {feedback.durationSec !== null ? (
          <p className="text-sm text-muted-foreground">
            Total time {formatDuration(feedback.durationSec)}
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          {feedback.mistakeCount === 0 ? (
            <p className="flex items-center gap-1 text-sm text-emerald-400">
              <CheckIcon className="size-4" />
              No corrections. Nice work.
            </p>
          ) : (
            feedback.corrections.map((correction, index) => (
              <div key={`${correction.original}-${index}`} className="flex gap-2">
                <PencilLineIcon className="mt-0.5 size-4 shrink-0 text-amber-400" />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-sm text-muted-foreground line-through">
                    {correction.original}
                  </p>
                  <p className="text-sm font-medium">{correction.corrected}</p>
                  <p className="text-xs text-muted-foreground">{correction.explanation}</p>
                </div>
              </div>
            ))
          )}
        </div>
        {used.length ? (
          <PhraseGroup title="Phrases you used">
            {used.map((phrase) => (
              <Badge
                key={phrase}
                variant="outline"
                className="border-emerald-400/30 text-emerald-400"
              >
                <CheckIcon />
                {phrase}
              </Badge>
            ))}
          </PhraseGroup>
        ) : null}
        {missed.length ? (
          <PhraseGroup title="Try these next time">
            {missed.map((phrase) => (
              <Badge key={phrase} variant="outline" className="text-muted-foreground">
                {phrase}
              </Badge>
            ))}
          </PhraseGroup>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xl font-semibold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function PhraseGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{title}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
