"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckIcon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Exercise, LessonDetail } from "@/lib/api/types"
import { api, describeError } from "@/lib/api/client"
import { haptic } from "@/lib/haptics"
import {
  isCorrect,
  buildQueue,
  requeueWrong,
  stageStats,
  type QueueItem,
} from "@/lib/lesson-player"
import { notifyError } from "@/lib/notify"
import { sentenceById } from "@/lib/lesson-helpers"
import { useApi } from "@/hooks/use-api"
import { ErrorCard } from "@/components/error-card"
import { GapExercise } from "@/components/exercises/gap-exercise"
import { ListenPickExercise } from "@/components/exercises/listen-pick-exercise"
import { MatchPairsExercise } from "@/components/exercises/match-pairs-exercise"
import { McqExercise } from "@/components/exercises/mcq-exercise"
import { OrderWordsExercise } from "@/components/exercises/order-words-exercise"
import { SpeakExercise } from "@/components/exercises/speak-exercise"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type Phase = "intro" | "exercise" | "stage-done" | "ready"
type Answer = string | string[] | null

const praise = ["Nice!", "Correct!", "Well done!", "Exactly right"]

export default function LessonPlayClient({ id }: { id: string }) {
  const load = useCallback(() => api.lesson(id), [id])
  const { data: lesson, error, loading, reload } = useApi(load)

  if (loading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 py-6">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-5">
        <ErrorCard error={error} onRetry={reload} />
      </div>
    )
  }
  return lesson ? <LessonPlayer id={id} lesson={lesson} /> : null
}

function LessonPlayer({ id, lesson }: { id: string; lesson: LessonDetail }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("intro")
  const [stageIndex, setStageIndex] = useState(0)
  const [queue, setQueue] = useState<QueueItem[]>(() =>
    buildQueue(lesson.stages[0]?.exercises ?? []),
  )
  const [answer, setAnswer] = useState<Answer>(null)
  const [checked, setChecked] = useState(false)
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [lastLabel, setLastLabel] = useState<string | undefined>()
  const [results, setResults] = useState<Record<string, boolean>>({})
  const [leaving, setLeaving] = useState(false)
  const [starting, setStarting] = useState(false)
  const skipRequested = useRef(false)

  const stage = lesson.stages[stageIndex]
  const item = queue[0]
  const current = item?.exercise
  const totalExercises = lesson.stages.reduce(
    (total, currentStage) => total + currentStage.exercises.length,
    0,
  )
  const attempted = Object.keys(results).length
  const progress = totalExercises === 0 ? 0 : (attempted / totalExercises) * 100
  const stats = useMemo(() => {
    if (!stage) return { firstTry: 0, total: 0 }
    const stageIds = new Set(stage.exercises.map((exercise) => exercise.id))
    return stageStats(
      Object.fromEntries(
        Object.entries(results).filter(([exerciseId]) => stageIds.has(exerciseId)),
      ),
    )
  }, [results, stage])

  useEffect(() => {
    if (phase !== "exercise") return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter") return
      if (checked) continueExercise()
      else if (canCheck(current, answer)) checkAnswer()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [answer, checked, current, phase, checkAnswer, continueExercise])

  function startStage() {
    setQueue(buildQueue(stage?.exercises ?? []))
    setAnswer(null)
    setChecked(false)
    setLastCorrect(null)
    setPhase("exercise")
  }

  function selectAnswer(value: string | string[]) {
    if (checked) return
    haptic.select()
    setAnswer(value)
  }

  function settle(correct: boolean, label?: string, skipFeedback = false) {
    if (checked || !item) return
    if (!item.retried) {
      setResults((previous) => ({ ...previous, [item.exercise.id]: correct }))
    }
    if (skipFeedback) {
      continueExercise(correct)
      return
    }
    setLastCorrect(correct)
    setLastLabel(label)
    setChecked(true)
    if (correct) haptic.success()
    else haptic.error()
    if (!correct) setQueue((previous) => requeueWrong(previous, item))
  }

  function checkAnswer() {
    if (!current || !canCheck(current, answer)) return
    const label =
      current.type === "mcq" || current.type === "gap" || current.type === "listen_pick"
        ? current.correct
        : current.type === "order_words"
          ? current.answer
          : undefined
    settle(isCorrect(current, answer as string | string[]), label)
  }

  function continueExercise(correct = lastCorrect) {
    if (correct === null || !item) return
    const remaining = queue.slice(1)
    setQueue(remaining)
    setAnswer(null)
    setChecked(false)
    setLastCorrect(null)
    setLastLabel(undefined)
    if (remaining.length > 0) return
    setPhase("stage-done")
    haptic.success()
  }

  function continueStage() {
    if (stageIndex + 1 >= lesson.stages.length) {
      setPhase("ready")
      return
    }
    setStageIndex((index) => index + 1)
    setQueue(buildQueue(lesson.stages[stageIndex + 1]?.exercises ?? []))
    setPhase("intro")
  }

  async function startConversation() {
    setStarting(true)
    try {
      const result = await api.startConversation(id)
      router.push(`/conversation/${result.conversationId}`)
    } catch (error) {
      notifyError(describeError(error))
      setStarting(false)
    }
  }

  const setResult = (correct: boolean, label?: string) => {
    const skipFeedback = skipRequested.current
    skipRequested.current = false
    settle(correct, label, skipFeedback)
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex w-full max-w-md flex-col gap-3 px-5 pt-5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Leave lesson"
            onClick={() => setLeaving((value) => !value)}
          >
            <XIcon />
          </Button>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-indigo-500 transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {leaving ? (
          <div className="flex animate-in items-center justify-between rounded-xl border border-border px-3 py-2 text-sm duration-200 fade-in-0 slide-in-from-top-1">
            <span>Leave this lesson?</span>
            <Button variant="ghost" size="sm" onClick={() => router.push(`/lessons/${id}`)}>
              Leave
            </Button>
          </div>
        ) : null}
        {stage ? <p className="text-xs text-muted-foreground">{stage.title}</p> : null}
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col px-5 pt-10 pb-32">
        {phase === "intro" && stage ? (
          <Card className="flex animate-in flex-col gap-5 rounded-2xl p-5 shadow-none duration-200 fade-in-0 slide-in-from-bottom-1">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{stage.title}</h1>
              <p className="mt-2 text-sm/6 text-muted-foreground">{stage.intro}</p>
            </div>
            <p className="text-sm text-muted-foreground">{stage.exercises.length} exercises</p>
            <Button variant="indigo" onClick={startStage}>
              Start
            </Button>
          </Card>
        ) : null}

        {phase === "exercise" && current ? (
          <div
            key={current.id}
            className="animate-in duration-200 fade-in-0 slide-in-from-bottom-1"
          >
            {item?.retried ? <p className="mb-3 text-xs text-muted-foreground">Try again</p> : null}
            <ExerciseView
              exercise={current}
              lesson={lesson}
              value={answer}
              checked={checked}
              onChange={selectAnswer}
              onResult={setResult}
              onSkip={() => {
                skipRequested.current = true
              }}
            />
          </div>
        ) : null}

        {phase === "stage-done" && stage ? (
          <div className="flex animate-in flex-col gap-5 text-center duration-200 fade-in-0 slide-in-from-bottom-1">
            <h1 className="text-2xl font-semibold tracking-tight">{stage.title} complete</h1>
            <p className="text-muted-foreground">
              {stats.firstTry} of {stats.total} right the first time
            </p>
            <Button variant="indigo" onClick={continueStage}>
              Continue
            </Button>
          </div>
        ) : null}

        {phase === "ready" ? (
          <div className="flex animate-in flex-col gap-6 duration-200 fade-in-0 slide-in-from-bottom-1">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Ready to chat?</h1>
              <p className="mt-2 text-sm text-muted-foreground">{lesson.chat.situation}</p>
            </div>
            <div className="flex flex-col gap-4">
              {lesson.sentences.map((sentence) => (
                <div key={sentence.id} className="border-b border-border pb-3 last:border-0">
                  <p className="text-base font-medium">{sentence.text}</p>
                  <p className="mt-1 text-sm text-muted-foreground" lang="hi">
                    {sentence.hi}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="indigo"
                className="w-full"
                loading={starting}
                onClick={() => void startConversation()}
              >
                Start conversation
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/lessons">Back to lessons</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </main>

      {phase === "exercise" &&
      current &&
      current.type !== "match_pairs" &&
      current.type !== "speak" &&
      !checked ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-border/60 bg-background px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-md">
            <Button
              variant="indigo"
              className="w-full"
              disabled={!canCheck(current, answer)}
              onClick={checkAnswer}
            >
              Check
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "exercise" && checked ? (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 animate-in border-t px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] duration-200 slide-in-from-bottom-2",
            lastCorrect
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
              : "border-rose-400/30 bg-rose-400/10 text-rose-400",
          )}
        >
          <div className="mx-auto flex max-w-md flex-col gap-3">
            <div className="flex items-start gap-2">
              {lastCorrect ? (
                <CheckIcon className="mt-0.5 size-5" />
              ) : (
                <XIcon className="mt-0.5 size-5" />
              )}
              <div>
                <p className="font-medium">
                  {lastCorrect ? praise[attempted % praise.length] : "Not quite"}
                </p>
                {!lastCorrect && lastLabel ? (
                  <p className="mt-1 text-sm">Correct answer: {lastLabel}</p>
                ) : null}
                {current.type !== "match_pairs" &&
                current.type !== "speak" &&
                current.explanation ? (
                  <p className="mt-2 text-sm text-foreground/80">{current.explanation}</p>
                ) : null}
              </div>
            </div>
            <Button variant="indigo" className="w-full" onClick={() => continueExercise()}>
              Continue
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ExerciseView({
  exercise,
  lesson,
  value,
  checked,
  onChange,
  onResult,
  onSkip,
}: {
  exercise: Exercise
  lesson: LessonDetail
  value: Answer
  checked: boolean
  onChange: (value: string | string[]) => void
  onResult: (correct: boolean, label?: string) => void
  onSkip: () => void
}) {
  switch (exercise.type) {
    case "mcq":
      return (
        <McqExercise
          exercise={exercise}
          value={typeof value === "string" ? value : null}
          onChange={onChange}
          disabled={checked}
        />
      )
    case "gap":
      return (
        <GapExercise
          exercise={exercise}
          value={typeof value === "string" ? value : null}
          onChange={onChange}
          disabled={checked}
        />
      )
    case "listen_pick":
      return (
        <ListenPickExercise
          exercise={exercise}
          value={typeof value === "string" ? value : null}
          onChange={onChange}
          disabled={checked}
        />
      )
    case "match_pairs":
      return <MatchPairsExercise exercise={exercise} onResult={onResult} />
    case "order_words":
      return (
        <OrderWordsExercise
          exercise={exercise}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          disabled={checked}
        />
      )
    case "speak": {
      const sentence = sentenceById(lesson, exercise.sentenceId)
      return sentence ? (
        <SpeakExercise
          exercise={exercise}
          sentence={sentence}
          onResult={onResult}
          onSkip={onSkip}
        />
      ) : null
    }
  }
}

function canCheck(exercise: Exercise | undefined, answer: Answer): boolean {
  if (!exercise || exercise.type === "match_pairs" || exercise.type === "speak") return false
  return Array.isArray(answer) ? answer.length > 0 : answer !== null && answer.length > 0
}
