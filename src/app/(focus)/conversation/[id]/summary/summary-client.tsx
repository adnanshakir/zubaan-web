"use client"

import { useCallback, useEffect, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckIcon, FlameIcon, PencilLineIcon, XIcon } from "lucide-react"
import { api, describeError } from "@/lib/api/client"
import { summarize, lessonScore, type PhraseScore } from "@/lib/lesson-score"
import { scoreLabel } from "@/lib/summary-score"
import { haptic } from "@/lib/haptics"
import { notifyError } from "@/lib/notify"
import { useApi } from "@/hooks/use-api"
import { ColoredSentence } from "@/components/colored-sentence"
import { ErrorCard } from "@/components/error-card"
import { ScoreRing } from "@/components/score-ring"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const CORRECTION_LABELS = {
  grammar: "Grammar",
  tense: "Tense",
  preposition: "Prepositions",
  word_choice: "Word choice",
  other: "Other",
} as const

export default function SummaryClient({ id }: { id: string }) {
  const router = useRouter()
  const load = useCallback(async () => {
    const conversation = await api.conversation(id)
    const [lesson, attempt] = await Promise.all([
      api.lesson(conversation.lessonId),
      conversation.attemptId ? api.attempt(conversation.attemptId) : Promise.resolve(null),
    ])
    return { conversation, lesson, attempt }
  }, [id])
  const { data, error, loading, reload } = useApi(load)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!data || data.conversation.status === "active") return
    const summary = summarize(data.lesson, data.attempt, data.conversation)
    const score = lessonScore(summary.input)
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

  const summary = summarize(data.lesson, data.attempt, data.conversation)
  const score = lessonScore(summary.input)
  const lessonId = data.conversation.lessonId
  const phraseCount = summary.perPhrase.filter((phrase) => phrase.outcome === "exact").length
  const chatCorrections = data.conversation.messages.flatMap((message) =>
    message.correction
      ? [{ original: message.text, ...message.correction, source: "chat" as const }]
      : [],
  )
  const exerciseCorrections =
    data.attempt?.mistakes.map((mistake) => ({
      original: mistake.original,
      corrected: mistake.corrected,
      explanation: mistake.explanation,
      type: mistake.mistakeType,
      source: "exercise" as const,
    })) ?? []
  const mistakes = [...exerciseCorrections, ...chatCorrections]
  const counts = mistakes.reduce<Record<string, number>>((result, mistake) => {
    result[mistake.type] = (result[mistake.type] ?? 0) + 1
    return result
  }, {})
  const mostCommon = mistakes.reduce<(typeof mistakes)[number] | null>(
    (best, mistake) => (!best || counts[mistake.type] > counts[best.type] ? mistake : best),
    null,
  )

  async function chatAgain() {
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
          {phraseCount} of {summary.perPhrase.length} phrases said in the conversation
        </p>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <Stat
          value={data.attempt ? `${summary.firstTryCorrect}/${summary.firstTryTotal}` : "-"}
          label="First try"
        />
        <Stat value={summary.skipped} label="Skipped" />
        <Stat
          value={
            data.attempt ? (
              <span className="flex items-center gap-1">
                <FlameIcon className="size-4 text-amber-400" />
                {data.attempt.bestStreak}
              </span>
            ) : (
              "-"
            )
          }
          label="Best streak"
        />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-medium">How you did</h2>
        <Card className="mt-3 flex flex-col gap-4 rounded-2xl p-4 shadow-none">
          {(
            [
              ["Words", summary.input.words],
              ["Sentences", summary.input.sentences],
              ["Speaking", summary.input.speaking],
              ["Conversation", summary.input.chat],
            ] as const
          ).map(([label, component]) =>
            component && component.possible > 0 ? (
              <ScoreRow key={label} label={label} component={component} />
            ) : null,
          )}
          {!data.attempt ? (
            <p className="text-xs text-muted-foreground">
              You skipped the exercises, so this score is for the conversation only.
            </p>
          ) : null}
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Phrases</h2>
        <div className="mt-3 flex flex-col gap-3">
          {summary.perPhrase.map((phrase, index) => (
            <PhraseCard key={`${phrase.phrase}-${index}`} phrase={phrase} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Work on this</h2>
        {mistakes.length === 0 ? (
          <p className="mt-3 flex items-center gap-1 text-sm text-emerald-400">
            <CheckIcon className="size-4" />
            No mistakes. Nice work.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm">
              Most mistakes: {CORRECTION_LABELS[mostCommon?.type ?? "other"]} (
              {mostCommon ? counts[mostCommon.type] : 0})
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {mistakes.map((mistake, index) => (
                <div key={`${mistake.original}-${index}`} className="flex gap-2">
                  <PencilLineIcon className="mt-0.5 size-4 shrink-0 text-amber-400" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-sm break-words text-muted-foreground line-through">
                      {mistake.original}
                    </p>
                    <p className="text-sm font-medium break-words">{mistake.corrected}</p>
                    <p className="text-xs text-muted-foreground">{mistake.explanation}</p>
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
        <Button asChild variant="indigo" className="w-full">
          <Link href={`/lessons/${lessonId}/play`}>Practice again</Link>
        </Button>
        <Button
          variant="outline"
          className="w-full"
          loading={starting}
          onClick={() => void chatAgain()}
        >
          Chat again
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/lessons">Back to lessons</Link>
        </Button>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: number | string | ReactNode; label: string }) {
  return (
    <Card className="rounded-2xl p-4 shadow-none">
      <div className="flex flex-col">
        <span className="text-xl font-semibold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </Card>
  )
}

function ScoreRow({
  label,
  component,
}: {
  label: string
  component: { earned: number; possible: number }
}) {
  const earned = Number.isInteger(component.earned) ? component.earned : component.earned.toFixed(1)
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {earned} of {component.possible}
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-indigo-500"
          style={{ width: `${(component.earned / component.possible) * 100}%` }}
        />
      </div>
    </div>
  )
}

function PhraseCard({ phrase }: { phrase: PhraseScore }) {
  const status =
    phrase.outcome === "exact"
      ? { label: "Said", color: "text-emerald-400", icon: CheckIcon, wordStatus: "match" as const }
      : phrase.outcome === "close"
        ? {
            label: "Almost",
            color: "text-amber-400",
            icon: CheckIcon,
            wordStatus: "close" as const,
          }
        : { label: "Not said", color: "text-rose-400", icon: XIcon, wordStatus: "missed" as const }
  const Icon = status.icon
  return (
    <Card className="rounded-2xl p-4 shadow-none">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${status.color}`} />
        <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
      </div>
      {phrase.text ? (
        <>
          <div className="mt-3">
            <ColoredSentence
              words={phrase.phrase
                .split(" ")
                .map((text) => ({ text, status: status.wordStatus, heard: null }))}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">You said: &quot;{phrase.text}&quot;</p>
        </>
      ) : (
        <p className="mt-3 text-base text-rose-400">{phrase.phrase}</p>
      )}
    </Card>
  )
}
