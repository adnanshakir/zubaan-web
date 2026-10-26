"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckIcon, CircleDotIcon, PencilLineIcon, XIcon } from "lucide-react"
import { api, describeError } from "@/lib/api/client"
import { bestAttempt, phraseStatus, type PhraseStatus } from "@/lib/phrase-status"
import { sessionScore, scoreLabel } from "@/lib/summary-score"
import { matchSpeech, type MatchResult } from "@/lib/speech-match"
import { haptic } from "@/lib/haptics"
import { notifyError } from "@/lib/notify"
import { useApi } from "@/hooks/use-api"
import { ColoredSentence } from "@/components/colored-sentence"
import { ErrorCard } from "@/components/error-card"
import { ScoreRing } from "@/components/score-ring"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

const CORRECTION_LABELS = {
  grammar: "Grammar",
  tense: "Tense",
  preposition: "Prepositions",
  word_choice: "Word choice",
  other: "Other",
} as const

type PhraseAttempt = { match: MatchResult; text: string } | null

function derivePhraseResults(
  roleplay: NonNullable<Awaited<ReturnType<typeof api.lesson>>["steps"][number]["roleplay"]>,
  userTurns: Awaited<ReturnType<typeof api.conversation>>["messages"],
) {
  if (roleplay.turns?.length) {
    const results = roleplay.turns.map((turn, turnIndex) => {
      const attempts = userTurns.filter((message) => message.turnIndex === turnIndex)
      const status = attempts.some((message) => message.outcome === "exact")
        ? ("said" as const)
        : attempts.some((message) => message.outcome === "close")
          ? ("close" as const)
          : ("none" as const)
      let attempt: PhraseAttempt = null
      for (const message of attempts) {
        if (message.outcome === "exact" || message.outcome === "close") {
          attempt = { match: matchSpeech(turn.expect, message.text), text: message.text }
        }
      }
      return { phrase: turn.expect, status, attempt }
    })
    return {
      statuses: results.map((result) => result.status),
      phraseResults: results,
      cleanTurns: userTurns.filter((message) => message.outcome === "exact").length,
    }
  }

  const spoken = userTurns.map((message) => message.text)
  const statuses = roleplay.targetPhrases.map((phrase) => phraseStatus(phrase, spoken))
  return {
    statuses,
    phraseResults: roleplay.targetPhrases.map((phrase, index) => ({
      phrase,
      status: statuses[index],
      attempt: bestAttempt(phrase, spoken),
    })),
    cleanTurns: userTurns.filter((message) => !message.correction).length,
  }
}

export default function SummaryClient({ id }: { id: string }) {
  const router = useRouter()
  const load = useCallback(async () => {
    const conversation = await api.conversation(id)
    const lesson = await api.lesson(conversation.lessonId)
    return { conversation, lesson }
  }, [id])
  const { data, error, loading, reload } = useApi(load)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!data || data.conversation.status === "active") return
    const userTurns = data.conversation.messages.filter((message) => message.role === "user")
    const roleplay = data.lesson.steps.find((step) => step.type === "roleplay")?.roleplay
    if (!roleplay) return
    const { statuses, cleanTurns } = derivePhraseResults(roleplay, userTurns)
    const score = sessionScore({
      phrases: statuses,
      userTurns: userTurns.length,
      cleanTurns,
    })
    if (score >= 65) haptic.success()
    else haptic.nudge()
  }, [data])

  if (loading) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-8">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="mx-auto max-w-md px-5 py-8">
        <ErrorCard error={error} onRetry={reload} />
      </div>
    )
  }
  if (!data) return null

  const roleplay = data.lesson.steps.find((step) => step.type === "roleplay")?.roleplay
  if (!roleplay) return null
  if (data.conversation.status === "active") {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
        <Card className="flex flex-col gap-4 rounded-2xl p-5 shadow-none">
          <h1 className="text-lg font-medium">This conversation isn&apos;t finished yet.</h1>
          <Button asChild variant="indigo">
            <Link href={`/conversation/${id}`}>Continue conversation</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const userTurns = data.conversation.messages.filter((message) => message.role === "user")
  const { statuses, phraseResults, cleanTurns } = derivePhraseResults(roleplay, userTurns)
  const score = sessionScore({
    phrases: statuses,
    userTurns: userTurns.length,
    cleanTurns,
  })
  const corrections = userTurns.flatMap((message) =>
    message.correction ? [{ original: message.text, ...message.correction }] : [],
  )
  const correctionCounts = corrections.reduce<Record<string, number>>((counts, correction) => {
    counts[correction.type] = (counts[correction.type] ?? 0) + 1
    return counts
  }, {})
  const mostCommonCorrection = corrections.length
    ? corrections.reduce((best, correction) =>
        correctionCounts[correction.type] > correctionCounts[best.type] ? correction : best,
      )
    : null
  const said = statuses.filter((status) => status === "said").length
  const lessonId = data.conversation.lessonId

  async function practiceAgain() {
    setStarting(true)
    try {
      const result = await api.startConversation(lessonId)
      router.push(`/conversation/${result.conversationId}`)
    } catch (requestError) {
      notifyError(describeError(requestError))
      setStarting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      <div className="flex animate-in flex-col items-center text-center duration-200 fade-in-0 slide-in-from-bottom-1">
        <span className="text-sm text-muted-foreground">{data.lesson.title}</span>
        <div className="mt-4">
          <ScoreRing score={score} label={scoreLabel(score)} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {said} of {phraseResults.length} phrases said
        </p>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <Stat value={userTurns.length} label="Turns" />
        <Stat value={corrections.length} label="Corrections" />
        <Stat
          value={
            data.conversation.durationSec === undefined
              ? "-"
              : formatDuration(data.conversation.durationSec)
          }
          label="Time"
        />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Phrases</h2>
        <div className="mt-3 flex flex-col gap-3">
          {phraseResults.map(({ phrase, status, attempt }) => (
            <PhraseCard key={phrase} phrase={phrase} status={status} attempt={attempt} />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Almost means the words were close but the ending or a small word was off.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Work on this</h2>
        {corrections.length === 0 ? (
          <p className="mt-3 flex items-center gap-1 text-sm text-emerald-400">
            <CheckIcon className="size-4" />
            No corrections. Nice work.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm">
              Most corrections: {CORRECTION_LABELS[mostCommonCorrection?.type ?? "other"]} (
              {mostCommonCorrection ? correctionCounts[mostCommonCorrection.type] : 0})
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {corrections.map((correction, index) => (
                <div key={`${correction.original}-${index}`} className="flex gap-2">
                  <PencilLineIcon className="mt-0.5 size-4 shrink-0 text-amber-400" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-sm break-words text-muted-foreground line-through">
                      {correction.original}
                    </p>
                    <p className="text-sm font-medium break-words">{correction.corrected}</p>
                    <p className="text-xs text-muted-foreground">{correction.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/mistakes">Review all mistakes</Link>
            </Button>
          </>
        )}
      </section>

      <div className="mt-auto flex flex-col gap-2 pt-8">
        <Button
          variant="indigo"
          className="w-full"
          loading={starting}
          onClick={() => void practiceAgain()}
        >
          Practice again
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/lessons">Back to lessons</Link>
        </Button>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <Card className="rounded-2xl p-4 shadow-none">
      <div className="flex flex-col">
        <span className="text-xl font-semibold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </Card>
  )
}

function PhraseCard({
  phrase,
  status,
  attempt,
}: {
  phrase: string
  status: PhraseStatus
  attempt: ReturnType<typeof bestAttempt>
}) {
  const Icon = status === "said" ? CheckIcon : status === "close" ? CircleDotIcon : XIcon
  const color =
    status === "said" ? "text-emerald-400" : status === "close" ? "text-amber-400" : "text-rose-400"
  return (
    <Card className="rounded-2xl p-4 shadow-none">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${color}`} />
        <span className={`text-sm font-medium ${color}`}>
          {status === "said" ? "Said" : status === "close" ? "Almost" : "Not said"}
        </span>
      </div>
      {status === "none" ? (
        <p className="mt-3 text-base text-rose-400">{phrase}</p>
      ) : attempt ? (
        <>
          <div className="mt-3">
            <ColoredSentence words={attempt.match.words} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">You said: &quot;{attempt.text}&quot;</p>
        </>
      ) : null}
    </Card>
  )
}
