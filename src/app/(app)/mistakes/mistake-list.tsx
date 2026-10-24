"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"
import { PlayIcon, SquareIcon } from "lucide-react"
import { api, describeError } from "@/lib/api/client"
import type { MistakeType, MistakesListResponse } from "@/lib/api/types"
import { useApi } from "@/hooks/use-api"
import { usePhrasePlayer } from "@/hooks/use-phrase-player"
import { ErrorCard } from "@/components/error-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface MistakeListProps {
  type: MistakeType | undefined
}

type Item = MistakesListResponse["items"][number]

const labels: Record<MistakeType, string> = {
  grammar: "Grammar",
  tense: "Tense",
  preposition: "Prepositions",
  word_choice: "Word choice",
  other: "Other",
}

export default function MistakeList({ type }: MistakeListProps) {
  const load = useCallback(() => api.mistakes({ type, limit: 20 }), [type])
  const { data, error, loading, reload } = useApi(load)
  const [extra, setExtra] = useState<Item[]>([])
  const [cursor, setCursor] = useState<string | null | undefined>(undefined)
  const [loadingMore, setLoadingMore] = useState(false)
  const player = usePhrasePlayer()
  const items = [...(data?.items ?? []), ...extra]
  const nextBefore = cursor === undefined ? (data?.nextBefore ?? null) : cursor

  async function loadMore() {
    if (!nextBefore) return
    setLoadingMore(true)
    try {
      const page = await api.mistakes({ type, limit: 20, before: nextBefore })
      setExtra((previous) => [...previous, ...page.items])
      setCursor(page.nextBefore)
    } catch (error) {
      toast.error(describeError(error))
    } finally {
      setLoadingMore(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-4 flex flex-col gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    )
  }
  if (error) return <ErrorCard error={error} onRetry={reload} />

  return (
    <div className="mt-4 flex animate-in flex-col gap-3 duration-200 fade-in-0 slide-in-from-bottom-1">
      {items.map((item) => {
        const status = player.active?.id === item.id ? player.active.status : null
        const isPlaying = status === "playing"
        return (
          <Card key={item.id} className="gap-2 rounded-2xl py-4 shadow-none">
            <CardContent className="flex items-start gap-3 px-5">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm text-muted-foreground line-through">{item.original}</span>
                <span className="text-base font-medium">{item.corrected}</span>
                {item.explanation ? (
                  <span className="text-xs text-muted-foreground">{item.explanation}</span>
                ) : null}
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="secondary">{labels[item.type]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en", {
                      day: "numeric",
                      month: "short",
                    }).format(new Date(item.createdAt))}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                aria-label={`Play: ${item.corrected}`}
                loading={status === "loading"}
                onClick={() =>
                  isPlaying ? player.stop() : void player.play(item.id, item.corrected)
                }
              >
                {status === "loading" ? null : isPlaying ? <SquareIcon /> : <PlayIcon />}
              </Button>
            </CardContent>
          </Card>
        )
      })}
      {nextBefore ? (
        <Button
          variant="outline"
          size="sm"
          className="self-center"
          loading={loadingMore}
          onClick={loadMore}
        >
          Load more
        </Button>
      ) : null}
    </div>
  )
}
