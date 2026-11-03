"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckIcon, MicIcon, SquareIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import type {
  Level,
  PlacementAnswer,
  PlacementResponse,
  PlacementResultResponse,
} from "@/lib/api/types"
import { api, describeError, getNativeLanguage } from "@/lib/api/client"
import { haptic } from "@/lib/haptics"
import { notifyError } from "@/lib/notify"
import { sfx } from "@/lib/sfx"
import { isNonLatin } from "@/lib/text"
import { nextPlacementStep, tierProgress } from "@/lib/placement-flow"
import { LEVEL_LABELS } from "@/lib/lesson-path"
import { useApi } from "@/hooks/use-api"
import { useWavRecorder } from "@/hooks/use-wav-recorder"
import { ErrorCard } from "@/components/error-card"
import { ReadAloud } from "@/components/placement/read-aloud"
import { ListenPickExercise } from "@/components/exercises/listen-pick-exercise"
import { McqExercise } from "@/components/exercises/mcq-exercise"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PillSelect } from "@/components/pill-select"

type Phase = "intro" | "question" | "free" | "result"
type Answer = PlacementAnswer

const instructions = {
  mcq: { en: "Choose the best answer.", native: "सबसे सही जवाब चुनें।" },
  listen_pick: { en: "Listen and choose what you hear.", native: "सुनकर सही जवाब चुनें।" },
  read_aloud: { en: "Read this sentence aloud.", native: "इस वाक्य को ज़ोर से पढ़ें।" },
} as const

const levelDescriptions: Record<Level, string> = {
  beginner: "We will start with simple everyday sentences and build your confidence step by step.",
  elementary: "You know the basics. We will work on everyday conversations and common mistakes.",
  intermediate:
    "You can already talk about many things. We will focus on clarity, work conversations and sounding natural.",
  advanced:
    "Your English is strong. We will polish clarity, longer stories and tough conversations.",
}

const levelOptions = (Object.keys(LEVEL_LABELS) as Level[]).map((value) => ({
  value,
  label: LEVEL_LABELS[value],
}))

export default function PlacementClient() {
  const load = useCallback(() => api.placement(getNativeLanguage() ?? undefined), [])
  const { data, error, loading, reload } = useApi(load)
  const [phase, setPhase] = useState<Phase>("intro")
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<PlacementResultResponse | null>(null)
  const [freeSample, setFreeSample] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [freeSeconds, setFreeSeconds] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (phase === "result") {
      haptic.success()
      sfx.play("complete")
    }
  }, [phase])

  if (loading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 py-8">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-10 w-full" />
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

  if (!data) return null

  if (phase === "intro") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
        <div className="mt-12 flex flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Let&apos;s find your starting point
          </h1>
          <p className="text-sm/6 text-muted-foreground">
            About 3 minutes. Answer what you can. This only decides which lessons we show you first.
          </p>
          <p className="text-sm text-muted-foreground" lang="hi">
            यह सिर्फ़ तय करता है कि आपको पहले कौन से पाठ दिखें।
          </p>
        </div>
        <div className="mt-auto flex flex-col gap-3 pt-12">
          <Button variant="indigo" className="w-full" onClick={() => setPhase("question")}>
            Start
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              void api.setPlacementLevel("beginner", "beginner").then(() => router.push("/home"))
            }}
          >
            I am a complete beginner
          </Button>
          <Button variant="ghost" onClick={() => router.push("/home")}>
            Skip for now
          </Button>
        </div>
      </main>
    )
  }

  if (phase === "question") {
    return (
      <QuestionPhase
        data={data}
        answers={answers}
        selected={selected}
        onSelected={setSelected}
        onNext={(answer) => {
          const nextAnswers = [...answers, answer]
          setAnswers(nextAnswers)
          setSelected(null)
          if (nextPlacementStep(data.tiers, nextAnswers).done) setPhase("free")
        }}
      />
    )
  }

  if (phase === "free") {
    return (
      <FreePhase
        data={data}
        sample={freeSample}
        seconds={freeSeconds}
        onSample={setFreeSample}
        onSeconds={setFreeSeconds}
        onFinish={async () => {
          setSubmitting(true)
          try {
            const response = await api.submitPlacement({
              answers,
              ...(freeSample ? { sample: freeSample } : {}),
            })
            setResult(response)
            setPhase("result")
          } catch (submissionError) {
            notifyError(describeError(submissionError))
          } finally {
            setSubmitting(false)
          }
        }}
        onSkip={() => {
          void api
            .submitPlacement({ answers })
            .then((response) => {
              setResult(response)
              setPhase("result")
            })
            .catch((submissionError) => notifyError(describeError(submissionError)))
        }}
        submitting={submitting}
      />
    )
  }

  if (!result) return null
  return <ResultPhase result={result} />
}

function QuestionPhase({
  data,
  answers,
  selected,
  onSelected,
  onNext,
}: {
  data: PlacementResponse
  answers: Answer[]
  selected: string | null
  onSelected: (value: string | null) => void
  onNext: (answer: Answer) => void
}) {
  const step = nextPlacementStep(data.tiers, answers)
  if (step.done) return null
  const item = step.item
  const instruction = data.instructions[item.kind] ?? instructions[item.kind]
  const choiceSelected = (value: string) => {
    haptic.select()
    onSelected(value)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <div className="flex gap-1.5" aria-label="Placement progress">
        {tierProgress(data.tiers, answers).map((progress) => (
          <span
            key={progress.tier}
            className={`h-1 flex-1 rounded-full ${
              progress.state === "done"
                ? "bg-indigo-500"
                : progress.state === "current"
                  ? "bg-indigo-500/40"
                  : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Question {answers.length + 1}</p>
      <div className="mt-8 flex flex-col gap-6">
        <div>
          <p className="text-base font-medium">{instruction.en}</p>
          <p className="mt-1 text-sm text-muted-foreground" lang="hi">
            {instruction.native}
          </p>
        </div>
        {item.kind === "mcq" ? (
          <McqExercise
            exercise={{
              id: item.id,
              type: "mcq",
              prompt: item.prompt,
              promptHi: item.native,
              options: item.options,
              correct: item.correct,
              explanation: "",
            }}
            value={selected}
            onChange={choiceSelected}
          />
        ) : item.kind === "listen_pick" ? (
          <ListenPickExercise
            exercise={{
              id: item.id,
              type: "listen_pick",
              prompt: item.prompt,
              text: item.text,
              options: item.options,
              correct: item.correct,
              explanation: "",
            }}
            native={item.native}
            value={selected}
            onChange={choiceSelected}
          />
        ) : (
          <ReadAloud item={item} onResult={(result) => onNext({ itemId: item.id, ...result })} />
        )}
      </div>
      {item.kind !== "read_aloud" ? (
        <Button
          variant="indigo"
          className="mt-auto w-full"
          disabled={selected === null}
          onClick={() => onNext({ itemId: item.id, passed: selected === item.correct })}
        >
          Next
        </Button>
      ) : null}
    </main>
  )
}

function FreePhase({
  data,
  sample,
  seconds,
  onSample,
  onSeconds,
  onFinish,
  onSkip,
  submitting,
}: {
  data: PlacementResponse
  sample: string | null
  seconds: number
  onSample: (sample: string | null) => void
  onSeconds: (seconds: number) => void
  onFinish: () => void
  onSkip: () => void
  submitting: boolean
}) {
  const startedAt = useRef<number | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const recorder = useWavRecorder({
    onRecorded: async (wav) => {
      setTranscribing(true)
      try {
        const result = await api.stt(wav, { language: "en-IN" })
        if (isNonLatin(result.text)) {
          notifyError("We couldn't read that as English. Try again, a little slower.")
          return
        }
        onSample(result.text.trim())
      } catch (error) {
        notifyError(describeError(error))
      } finally {
        setTranscribing(false)
      }
    },
    onError: notifyError,
  })

  const { status, start, stop } = recorder

  useEffect(() => {
    if (status !== "recording") return
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000)
      onSeconds(Math.min(elapsed, data.free.maxSeconds))
      if (elapsed >= data.free.maxSeconds) stop()
    }, 250)
    return () => window.clearInterval(timer)
  }, [data.free.maxSeconds, onSeconds, status, stop])

  function toggleRecording() {
    if (status === "recording") {
      haptic.nudge()
      stop()
      return
    }
    onSample(null)
    startedAt.current = Date.now()
    onSeconds(0)
    haptic.nudge()
    void start()
  }

  const recording = status === "recording"
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <div className="mt-12 flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">One last thing</h1>
        <p className="text-sm/6 text-muted-foreground">{data.free.en}</p>
        <p className="text-sm text-muted-foreground" lang="hi">
          {data.free.native}
        </p>
      </div>
      <div className="mt-12 flex flex-col items-center gap-4">
        <Button
          variant={recording ? "indigo" : "outline"}
          size="icon-lg"
          aria-label={recording ? "Stop recording" : "Record a sample"}
          loading={status === "encoding" || transcribing}
          onClick={toggleRecording}
        >
          {recording ? <SquareIcon /> : <MicIcon />}
        </Button>
        <span className="font-mono text-sm text-muted-foreground">{seconds}s</span>
        {sample ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckIcon />
            Recorded
          </span>
        ) : null}
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-12">
        <Button
          variant="indigo"
          className="w-full"
          disabled={!sample || submitting || recording || transcribing}
          loading={submitting}
          onClick={onFinish}
        >
          Finish
        </Button>
        <Button variant="ghost" disabled={submitting} onClick={onSkip}>
          Skip
        </Button>
      </div>
    </main>
  )
}

function ResultPhase({ result }: { result: PlacementResultResponse }) {
  const router = useRouter()
  const [level, setLevel] = useState(result.level)
  const [changing, setChanging] = useState(false)
  const speakingTotal = result.speaking.total
  const understandingTotal = result.understanding.total
  const showsUnderstandingStrength =
    speakingTotal > 0 &&
    result.speaking.passed / speakingTotal + 0.34 < result.understanding.passed / understandingTotal

  async function changeLevel(next: Level) {
    setLevel(next)
    setChanging(true)
    try {
      await api.setPlacementLevel(next, "manual")
    } catch (error) {
      notifyError(describeError(error))
    } finally {
      setChanging(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <div className="mt-12 flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">Your starting point</p>
        <h1 className="text-3xl font-semibold">{LEVEL_LABELS[level]}</h1>
        <p className="text-sm/6 text-muted-foreground">{levelDescriptions[level]}</p>
        {showsUnderstandingStrength ? (
          <p className="text-sm/6 text-muted-foreground">
            You understand more than you speak. We will give extra practice to speaking.
          </p>
        ) : result.speaking.skipped > 0 ? (
          <p className="text-sm/6 text-muted-foreground">
            You skipped some speaking questions, so this level may be lower than your real level.
            You can change it below.
          </p>
        ) : null}
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <p className="text-sm font-medium">Change level</p>
        <PillSelect
          label="Starting level"
          options={levelOptions}
          value={level}
          onChange={changeLevel}
        />
        <p className="text-xs text-muted-foreground">
          Pick a lower level if this felt too hard, or a higher one if it felt too easy.
        </p>
      </div>
      <Button
        variant="indigo"
        className="mt-auto w-full"
        disabled={changing}
        onClick={() => router.push("/home")}
      >
        Start learning
      </Button>
    </main>
  )
}
