"use client"

import { useCallback } from "react"
import Link from "next/link"
import { api } from "@/lib/api/client"
import { useApi } from "@/hooks/use-api"
import { ErrorCard } from "@/components/error-card"
import ConversationView from "./conversation-view"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function ConversationClient({ id }: { id: string }) {
  const load = useCallback(async () => {
    const conversation = await api.conversation(id)
    const lesson = await api.lesson(conversation.lessonId)
    return { conversation, lesson }
  }, [id])
  const { data, error, loading, reload } = useApi(load)

  if (loading) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 px-5 py-8">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-24 w-4/5 rounded-2xl" />
        <Skeleton className="h-24 w-4/5 self-end rounded-2xl" />
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
  if (!roleplay) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-start gap-4 px-5 py-8">
        <p className="text-sm text-muted-foreground">This lesson has no conversation.</p>
        <Button asChild variant="indigo">
          <Link href="/lessons">Back to lessons</Link>
        </Button>
      </div>
    )
  }

  return (
    <ConversationView conversation={data.conversation} lesson={data.lesson} roleplay={roleplay} />
  )
}
