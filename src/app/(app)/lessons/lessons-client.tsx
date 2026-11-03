"use client"

import Link from "next/link"
import { CheckIcon, LockIcon } from "lucide-react"
import { useState } from "react"
import { api } from "@/lib/api/client"
import { haptic } from "@/lib/haptics"
import { groupByLevel } from "@/lib/lesson-path"
import { useApi } from "@/hooks/use-api"
import { PageHeader } from "@/components/page-header"
import { ErrorCard } from "@/components/error-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function LessonsClient() {
  const { data, error, loading, reload } = useApi(api.lessons)
  const [lockedId, setLockedId] = useState<string | null>(null)

  return (
    <>
      <PageHeader
        title="Your path"
        description="Build your speaking confidence one lesson at a time."
      />
      {loading ? (
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6">
          <ErrorCard error={error} onRetry={reload} />
        </div>
      ) : data ? (
        <div className="mt-6 flex flex-col gap-6">
          <div>
            <p className="text-sm text-muted-foreground">
              {data.filter((lesson) => lesson.progress.status === "completed").length} of{" "}
              {data.length} lessons
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-indigo-500"
                style={{
                  width: `${data.length ? (data.filter((lesson) => lesson.progress.status === "completed").length / data.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          {groupByLevel(data).map((group) => (
            <section key={group.level}>
              <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {group.label}
              </h2>
              <div className="flex flex-col gap-3">
                {group.lessons.map((lesson) => {
                  const locked = lesson.progress.status === "locked"
                  const content = (
                    <>
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border">
                        {lesson.progress.status === "completed" ? (
                          <CheckIcon className="size-4 text-emerald-400" />
                        ) : locked ? (
                          <LockIcon className="size-4 text-muted-foreground" />
                        ) : (
                          <span className="text-sm">{lesson.order}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-medium">{lesson.title}</h3>
                          {lesson.progress.status === "completed" ? (
                            <span className="shrink-0 text-sm text-muted-foreground">
                              {lesson.progress.bestScore}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {lesson.level === "beginner" || lesson.level === "elementary"
                            ? lesson.canDo
                            : lesson.objective}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {lesson.estimatedMinutes} min
                        </p>
                        {locked && lockedId === lesson.id ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Finish {lesson.progress.unlockAfter?.title} to unlock this lesson.
                          </p>
                        ) : null}
                      </div>
                      {lesson.isCurrent && !locked ? (
                        <Button asChild variant="indigo" size="sm">
                          <Link href={`/lessons/${lesson.id}`}>Start</Link>
                        </Button>
                      ) : null}
                    </>
                  )
                  const rowClass = `flex gap-3 rounded-2xl border p-4 ${
                    lesson.isCurrent ? "border-indigo-400 bg-indigo-400/10" : ""
                  }`
                  return locked ? (
                    <button
                      key={lesson.id}
                      type="button"
                      className="flex w-full gap-3 rounded-2xl border p-4 text-left opacity-60 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      onClick={() => {
                        setLockedId(lockedId === lesson.id ? null : lesson.id)
                        haptic.nudge()
                      }}
                    >
                      {content}
                    </button>
                  ) : lesson.isCurrent ? (
                    <div key={lesson.id} className={rowClass}>
                      {content}
                    </div>
                  ) : (
                    <Link
                      key={lesson.id}
                      href={`/lessons/${lesson.id}`}
                      className={`${rowClass} outline-none focus-visible:ring-3 focus-visible:ring-ring/50`}
                    >
                      {content}
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </>
  )
}
