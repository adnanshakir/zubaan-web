"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckIcon, CircleDotIcon, PencilLineIcon, XIcon } from "lucide-react"
import { api, describeError } from "@/lib/api/client"
import { phraseStatus } from "@/lib/phrase-status"
import { notifyError } from "@/lib/notify"
import { useApi } from "@/hooks/use-api"
import { ErrorCard } from "@/components/error-card"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}:${String(remaining).padStart(2, "0")}`
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

  async function practiceAgain() {
    if (!data) return
    setStarting(true)
    try {
      const result = await api.startConversation(data.conversation.lessonId)
      router.push(`/conversation/${result.conversationId}`)
    } catch (requestError) {
      notifyError(describeError(requestError))
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-8">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
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
  const userMessages = data.conversation.messages.filter((message) => message.role === "user")
  const spoken = userMessages.map((message) => message.text)
  const targetPhrases = roleplay?.targetPhrases ?? []
  const phraseResults = targetPhrases.map((phrase) => ({
    phrase,
    status: phraseStatus(phrase, spoken),
  }))
  const corrections = userMessages.flatMap((message) =>
    message.correction ? [{ original: message.text, ...message.correction }] : [],
  )
  const saidCount = phraseResults.filter((result) => result.status === "said").length

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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      <span className="text-sm text-muted-foreground">{data.lesson.title}</span>
      <h1 className="text-2xl font-semibold tracking-tight">How it went</h1>
      <div className="mt-6 grid animate-in grid-cols-3 gap-3 duration-200 fade-in-0 slide-in-from-bottom-1">
        <Stat value={userMessages.length} label="turns" />
        <Stat value={corrections.length} label="corrections" />
        <Stat value={`${saidCount}/${phraseResults.length}`} label="phrases" />
      </div>
      {data.conversation.durationSec !== undefined ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Total time {formatDuration(data.conversation.durationSec)}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-medium">Phrases</h2>
        <div className="mt-3 flex flex-col gap-3">
          {phraseResults.map(({ phrase, status }) => {
            const Icon = status === "said" ? CheckIcon : status === "close" ? CircleDotIcon : XIcon
            const color =
              status === "said"
                ? "text-emerald-400"
                : status === "close"
                  ? "text-amber-400"
                  : "text-rose-400"
            return (
              <div key={phrase} className="flex items-start gap-2">
                <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} />
                <div className="min-w-0">
                  <p className="text-sm break-words">{phrase}</p>
                  {status !== "said" ? (
                    <p className={`text-xs ${color}`}>
                      {status === "close" ? "Almost" : "Not said"}
                    </p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Corrections</h2>
        {corrections.length === 0 ? (
          <p className="mt-3 flex items-center gap-1 text-sm text-emerald-400">
            <CheckIcon className="size-4" />
            No corrections. Nice work.
          </p>
        ) : (
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
    <div className="flex flex-col">
      <span className="text-xl font-semibold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
