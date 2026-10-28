"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckIcon, FlameIcon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import type { AttemptResultRequest, Exercise, LessonDetail } from "@/lib/api/types"
import { api, describeError } from "@/lib/api/client"
import { haptic } from "@/lib/haptics"
import { createAttemptSync } from "@/lib/attempt-sync"
import {
  isCorrect,
  buildQueue,
  scheduleRetry,
  stageStats,
  streakAfter,
  streakMilestone,
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

type Phase = "intro" | "exercise" | "review" | "stage-done" | "ready"
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
  const [plan, setPlan] = useState(() => ({
    queue: buildQueue(lesson.stages[0]?.exercises ?? []),
    review: [] as QueueItem[],
  }))
  const [answer, setAnswer] = useState<Answer>(null)
  const [checked, setChecked] = useState(false)
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [lastLabel, setLastLabel] = useState<string | undefined>()
  const [results, setResults] = useState<Record<string, boolean>>({})
  const [leaving, setLeaving] = useState(false)
  const [starting, setStarting] = useState(false)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [milestone, setMilestone] = useState<string | null>(null)
  const [lastStreakEnded, setLastStreakEnded] = useState<number | null>(null)
  const skipRequested = useRef(false)
  const milestoneTimeout = useRef<number | null>(null)
  const attemptId = useRef<string | null>(null)
  const attemptCompleted = useRef(false)
  const pendingAttempt = useRef<Promise<string> | null>(null)
  const attemptSync = useRef<ReturnType<typeof createAttemptSync> | null>(null)

  useEffect(() => {
    let active = true
    const creation = api.startAttempt(id).then((result) => {
      if (active) {
        attemptId.current = result.attemptId
      }
      return result.attemptId
    })
    pendingAttempt.current = creation
    attemptSync.current = createAttemptSync(creation)
    void creation.catch(() => {
      console.warn("Could not start lesson attempt")
      if (pendingAttempt.current === creation) {
        pendingAttempt.current = null
        attemptSync.current = null
      }
    })
    return () => {
      active = false
    }
  }, [id])

  const stage = lesson.stages[stageIndex]
  const item = plan.queue[0]
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
    setPlan({ queue: buildQueue(stage?.exercises ?? []), review: [] })
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

  function settle(
    correct: boolean,
    label?: string,
    skipFeedback = false,
    verdict?: "said" | "close" | "missed",
  ) {
    if (checked || !item) return
    if (!item.retried) {
      setResults((previous) => ({ ...previous, [item.exercise.id]: correct }))
      const nextStreak = streakAfter(
        streak,
        skipFeedback ? "skipped" : correct ? "correct" : "wrong",
        false,
      )
      setStreak(nextStreak)
      setBestStreak((previous) => Math.max(previous, nextStreak))
      setLastStreakEnded(!correct && !skipFeedback && streak >= 3 ? streak : null)
      const message = streakMilestone(nextStreak)
      if (message) {
        setMilestone(message)
        if (nextStreak === 3) haptic.nudge()
        else haptic.success()
        if (milestoneTimeout.current !== null) {
          window.clearTimeout(milestoneTimeout.current)
        }
        milestoneTimeout.current = window.setTimeout(() => setMilestone(null), 1800)
      }
    } else {
      setLastStreakEnded(null)
    }
    const result: AttemptResultRequest["result"] = skipFeedback
      ? "skipped"
      : current?.type === "speak"
        ? (verdict ?? (correct ? "said" : "missed"))
        : correct
          ? "correct"
          : "wrong"
    const payload: AttemptResultRequest = {
      exerciseId: item.exercise.id,
      result,
      ...(current?.type === "order_words" && Array.isArray(answer) ? { answer } : {}),
      ...(current?.type !== "order_words" && current?.type !== "speak" && typeof answer === "string"
        ? { answer }
        : {}),
      ...(item.retried ? { retry: true } : {}),
    }
    attemptSync.current?.record(payload)
    if (skipFeedback) {
      continueExercise(correct)
      return
    }
    setLastCorrect(correct)
    setLastLabel(label)
    setChecked(true)
    if (correct) haptic.success()
    else haptic.error()
    if (!correct) {
      setPlan((previous) => scheduleRetry(previous, 0, item))
    }
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
    const remaining = plan.queue.slice(1)
    setPlan((previous) => ({ ...previous, queue: remaining }))
    setAnswer(null)
    setChecked(false)
    setLastCorrect(null)
    setLastLabel(undefined)
    if (remaining.length > 0) return
    if (plan.review.length > 0) {
      setPhase("review")
      return
    }
    setPhase("stage-done")
    haptic.success()
  }

  function startReview() {
    setPlan({ queue: plan.review, review: [] })
    setAnswer(null)
    setChecked(false)
    setLastCorrect(null)
    setPhase("exercise")
  }

  function continueStage() {
    if (stageIndex + 1 >= lesson.stages.length) {
      setPhase("ready")
      return
    }
    setStageIndex((index) => index + 1)
    setPlan({
      queue: buildQueue(lesson.stages[stageIndex + 1]?.exercises ?? []),
      review: [],
    })
    setPhase("intro")
  }

  async function startConversation() {
    setStarting(true)
    try {
      if (!pendingAttempt.current) {
        const creation = api.startAttempt(id).then((result) => {
          attemptId.current = result.attemptId
          attemptSync.current = createAttemptSync(result.attemptId)
          return result.attemptId
        })
        pendingAttempt.current = creation
        attemptSync.current = createAttemptSync(creation)
        void creation.catch(() => {
          console.warn("Could not start lesson attempt")
          if (pendingAttempt.current === creation) {
            pendingAttempt.current = null
            attemptSync.current = null
          }
        })
      }
      let attemptFailed = !attemptSync.current
      try {
        await Promise.race([
          attemptSync.current?.flush(),
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error("Attempt sync timed out")), 3000),
          ),
        ])
      } catch (error) {
        attemptFailed = true
        console.warn("Could not sync lesson attempt", error)
      }
      if (!attemptFailed && attemptId.current && !attemptCompleted.current) {
        try {
          await api.completeAttempt(attemptId.current, { bestStreak })
          attemptCompleted.current = true
        } catch (error) {
          attemptFailed = true
          console.warn("Could not complete lesson attempt", error)
        }
      }
      const result = await api.startConversation(
        id,
        !attemptFailed && attemptId.current ? { attemptId: attemptId.current } : {},
      )
      router.push(`/conversation/${result.conversationId}`)
    } catch (error) {
      notifyError(describeError(error))
      setStarting(false)
    }
  }

  const setResult = (correct: boolean, label?: string, verdict?: "said" | "close" | "missed") => {
    const skipFeedback = skipRequested.current
    skipRequested.current = false
    settle(correct, label, skipFeedback, verdict)
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="relative mx-auto flex w-full max-w-md flex-col gap-3 px-5 pt-5">
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
          {streak >= 2 ? (
            <div
              key={streak}
              className="flex shrink-0 animate-in items-center gap-1 text-sm text-amber-400 duration-200 zoom-in-95 motion-reduce:animate-none"
            >
              <FlameIcon className="size-4" />
              <span>{streak}</span>
            </div>
          ) : null}
        </div>
        {milestone ? (
          <div className="pointer-events-none absolute inset-x-0 top-12 z-20 flex justify-center">
            <div className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-400">
              {milestone}
            </div>
          </div>
        ) : null}
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

        {phase === "review" ? (
          <Card className="flex animate-in flex-col gap-5 rounded-2xl p-5 shadow-none duration-200 fade-in-0 slide-in-from-bottom-1">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Quick review</h1>
              <p className="mt-2 text-sm text-muted-foreground">{plan.review.length} to fix</p>
            </div>
            <Button variant="indigo" onClick={startReview}>
              Start
            </Button>
          </Card>
        ) : null}

        {phase === "stage-done" && stage ? (
          <div className="flex animate-in flex-col gap-5 text-center duration-200 fade-in-0 slide-in-from-bottom-1">
            <h1 className="text-2xl font-semibold tracking-tight">{stage.title} complete</h1>
            <p className="text-muted-foreground">
              {stats.firstTry} of {stats.total} right the first time
              {bestStreak >= 2 ? ` · Best streak ${bestStreak}` : ""}
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
              ? "border-emerald-400 bg-emerald-400/10 text-emerald-400"
              : "border-rose-400 bg-rose-400/10 text-rose-400",
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
                {!lastCorrect && lastStreakEnded !== null ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Streak ended at {lastStreakEnded}
                  </p>
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
  onResult: (correct: boolean, label?: string, verdict?: "said" | "close" | "missed") => void
  onSkip: () => void
}) {
  switch (exercise.type) {
    case "mcq":
      return (
        <McqExercise
          exercise={exercise}
          value={typeof value === "string" ? value : null}
          onChange={onChange}
          checked={checked}
          disabled={checked}
        />
      )
    case "gap":
      return (
        <GapExercise
          exercise={exercise}
          value={typeof value === "string" ? value : null}
          onChange={onChange}
          checked={checked}
          disabled={checked}
        />
      )
    case "listen_pick":
      return (
        <ListenPickExercise
          exercise={exercise}
          value={typeof value === "string" ? value : null}
          onChange={onChange}
          checked={checked}
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
          checked={checked}
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
