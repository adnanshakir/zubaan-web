"use client"

import Link from "next/link"
import { useCallback, useState } from "react"
import { ChevronLeftIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { api, describeError } from "@/lib/api/client"
import { exerciseCount } from "@/lib/lesson-helpers"
import { notifyError } from "@/lib/notify"
import { useApi } from "@/hooks/use-api"
import { ErrorCard } from "@/components/error-card"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface LessonDetailClientProps {
  id: string
}

export default function LessonDetailClient({ id }: LessonDetailClientProps) {
  const load = useCallback(() => api.lesson(id), [id])
  const { data: lesson, error, loading, reload } = useApi(load)

  return (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/lessons">
          <ChevronLeftIcon />
          Lessons
        </Link>
      </Button>
      {loading ? (
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : error ? (
        <div className="mt-6">
          <ErrorCard error={error} onRetry={reload} />
        </div>
      ) : lesson ? (
        <LessonContent id={id} lesson={lesson} />
      ) : null}
    </>
  )
}

function LessonContent({
  id,
  lesson,
}: {
  id: string
  lesson: Awaited<ReturnType<typeof api.lesson>>
}) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)

  async function skipToConversation() {
    setStarting(true)
    try {
      const result = await api.startConversation(id)
      router.push(`/conversation/${result.conversationId}`)
    } catch (error) {
      notifyError(describeError(error))
      setStarting(false)
    }
  }

  return (
    <div className="mt-5 flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lesson.objective}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {lesson.sentences.length} sentences · {exerciseCount(lesson)} exercises · about{" "}
          {lesson.estimatedMinutes} min
        </p>
      </header>

      <section className="flex flex-col">
        <StageRow
          number={1}
          title={lesson.stages[0]?.title ?? "Words"}
          intro={lesson.stages[0]?.intro}
        />
        <StageRow
          number={2}
          title={lesson.stages[1]?.title ?? "Sentences"}
          intro={lesson.stages[1]?.intro}
        />
        <StageRow
          number={3}
          title="Conversation"
          intro={lesson.chat.situation}
          goal={lesson.chat.goal}
          last
        />
      </section>

      <section>
        <h2 className="text-lg font-medium">What you will say</h2>
        <Card className="mt-3 flex flex-col gap-4 rounded-2xl p-5 shadow-none">
          {lesson.sentences.map((sentence) => (
            <div key={sentence.id} className="flex flex-col gap-1">
              <p className="text-base font-medium">{sentence.text}</p>
              <p className="text-sm text-muted-foreground" lang="hi">
                {sentence.hi}
              </p>
            </div>
          ))}
        </Card>
      </section>

      <div className="flex flex-col gap-2">
        <Button variant="indigo" className="w-full" asChild>
          <Link href={`/lessons/${id}/play`}>Start lesson</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          loading={starting}
          disabled={starting}
          onClick={() => void skipToConversation()}
        >
          Skip to conversation
        </Button>
      </div>
    </div>
  )
}

function StageRow({
  number,
  title,
  intro,
  goal,
  last = false,
}: {
  number: number
  title: string
  intro?: string
  goal?: string
  last?: boolean
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-sm font-medium">
          {number}
        </span>
        {!last ? <span className="h-full w-px bg-border" /> : null}
      </div>
      <div className={`flex min-h-20 flex-col gap-1 ${last ? "" : "pb-5"}`}>
        <h2 className="text-base font-medium">{title}</h2>
        {intro ? <p className="text-sm text-muted-foreground">{intro}</p> : null}
        {goal ? <p className="text-sm text-muted-foreground">Goal: {goal}</p> : null}
      </div>
    </div>
  )
}
