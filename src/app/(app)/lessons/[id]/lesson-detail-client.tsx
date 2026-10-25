"use client"

import Link from "next/link"
import { useCallback, useState } from "react"
import { ChevronLeftIcon } from "lucide-react"
import { TextMorph } from "torph/react"
import { useRouter } from "next/navigation"
import { describeError, getNativeLanguage, api } from "@/lib/api/client"
import { notifyError } from "@/lib/notify"
import { useApi } from "@/hooks/use-api"
import { usePhrasePlayer } from "@/hooks/use-phrase-player"
import { PhraseRow } from "@/components/phrase-row"
import { ErrorCard } from "@/components/error-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface LessonDetailClientProps {
  id: string
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function LessonDetailClient({ id }: LessonDetailClientProps) {
  const load = useCallback(() => api.lesson(id), [id])
  const { data: lesson, error, loading, reload } = useApi(load)
  const player = usePhrasePlayer()

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
        <LessonContent lesson={lesson} player={player} />
      ) : null}
    </>
  )
}

function LessonContent({
  lesson,
  player,
}: {
  lesson: Awaited<ReturnType<typeof api.lesson>>
  player: ReturnType<typeof usePhrasePlayer>
}) {
  const nativeLanguage = getNativeLanguage()
  const allPhrases = lesson.steps
    .filter((step) => step.type === "learn")
    .flatMap((step) => step.phrases ?? [])

  return (
    <>
      <header className="mt-5">
        <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lesson.objective}</p>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="secondary">{capitalize(lesson.category)}</Badge>
          <Badge variant="outline">{capitalize(lesson.level)}</Badge>
          <span className="text-xs text-muted-foreground">{lesson.estimatedMinutes} min</span>
        </div>
      </header>
      <div className="mt-6 flex animate-in flex-col gap-3 duration-200 fade-in-0 slide-in-from-bottom-1">
        {[...lesson.steps]
          .sort((left, right) => left.order - right.order)
          .map((step) => (
            <Card key={step.order} className="rounded-2xl px-5 py-5 shadow-none">
              <span className="text-xs text-muted-foreground">Step {step.order}</span>
              {step.type === "learn" ? (
                <StepCard title="Learn the phrases">
                  {(step.phrases ?? []).map((phrase, index) => (
                    <PhraseRow
                      key={`learn-${index}`}
                      id={`learn-${index}`}
                      text={phrase.text}
                      hint={nativeLanguage ? phrase.hints[nativeLanguage] : undefined}
                      hintLang={nativeLanguage ?? undefined}
                      tip={phrase.tip}
                      player={player}
                    />
                  ))}
                </StepCard>
              ) : step.type === "repeat" ? (
                <StepCard title="Say them out loud">
                  {(step.phraseIndexes ?? []).map((index) => {
                    const phrase = allPhrases[index]
                    return phrase ? (
                      <PhraseRow
                        key={`repeat-${index}`}
                        id={`repeat-${index}`}
                        text={phrase.text}
                        player={player}
                      />
                    ) : null
                  })}
                  <p className="text-xs text-muted-foreground">
                    Recording and feedback arrive in the next step.
                  </p>
                </StepCard>
              ) : (
                <RoleplayCard lessonId={lesson.id} roleplay={step.roleplay} />
              )}
            </Card>
          ))}
      </div>
    </>
  )
}

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </div>
  )
}

function RoleplayCard({
  lessonId,
  roleplay,
}: {
  lessonId: string
  roleplay: Awaited<ReturnType<typeof api.lesson>>["steps"][number]["roleplay"]
}) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  if (!roleplay) return null

  async function startConversation() {
    setStarting(true)
    try {
      const result = await api.startConversation(lessonId)
      router.push(`/conversation/${result.conversationId}`)
    } catch (error) {
      notifyError(describeError(error))
      setStarting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Practice in a conversation</h2>
      <p className="text-sm">{roleplay.situation}</p>
      <div className="flex flex-col gap-1 text-sm">
        <p>
          <span className="text-muted-foreground">You: </span>
          {roleplay.userRole}
        </p>
        <p>
          <span className="text-muted-foreground">Them: </span>
          {roleplay.aiRole}
        </p>
        <p>
          <span className="text-muted-foreground">Goal: </span>
          {roleplay.goal}
        </p>
      </div>
      <span className="text-xs text-muted-foreground">Up to {roleplay.maxTurns} turns</span>
      {roleplay.targetPhrases.length ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Try to use</span>
          <div className="flex flex-wrap gap-2">
            {roleplay.targetPhrases.map((phrase) => (
              <Badge key={phrase} variant="outline">
                {phrase}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
      <Button
        variant="indigo"
        loading={starting}
        disabled={starting}
        className="w-full"
        onClick={() => void startConversation()}
      >
        <TextMorph>{starting ? "Preparing" : "Start conversation"}</TextMorph>
      </Button>
    </div>
  )
}
