"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ApiError, api, clearUserId, describeError } from "@/lib/api/client"
import { useApi } from "@/hooks/use-api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function HomeClient() {
  const { data, error, loading, reload } = useApi(api.home)
  const router = useRouter()
  const unauthorized = error instanceof ApiError && error.status === 401

  useEffect(() => {
    if (unauthorized) {
      clearUserId()
      router.replace("/onboarding")
    }
  }, [router, unauthorized])

  return (
    <>
      <header>
        {loading || !data ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-5 w-56" />
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Hi, {data.greetingName}</h1>
            <p className="text-sm text-muted-foreground">Ready to practice speaking?</p>
          </>
        )}
      </header>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Recommended for you</h2>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-44 rounded-2xl" />
          ) : error && !unauthorized ? (
            <Card className="gap-4 rounded-2xl p-5 shadow-none">
              <p className="text-sm text-muted-foreground">{describeError(error)}</p>
              <Button variant="outline" size="sm" onClick={reload}>
                Try again
              </Button>
            </Card>
          ) : data?.recommendedLesson === null ? (
            <Card className="gap-1 rounded-2xl p-5 shadow-none">
              <p className="text-sm font-medium">No lessons available yet.</p>
              <p className="text-xs text-muted-foreground">
                Add lessons in the backend, then refresh.
              </p>
            </Card>
          ) : data?.recommendedLesson ? (
            <Card className="animate-in gap-4 rounded-2xl py-5 shadow-none duration-200 fade-in-0 slide-in-from-bottom-1">
              <CardContent className="flex flex-col gap-4 px-5">
                <div>
                  <h3 className="text-base font-medium">{data.recommendedLesson.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {data.recommendedLesson.objective}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{data.recommendedLesson.category}</Badge>
                  <Badge variant="outline">
                    {data.recommendedLesson.level.charAt(0).toUpperCase()}
                    {data.recommendedLesson.level.slice(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {data.recommendedLesson.estimatedMinutes} min
                  </span>
                </div>
                <Button asChild className="w-full">
                  <Link href={`/lessons/${data.recommendedLesson.id}`}>Start lesson</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>

      <Button
        variant="ghost"
        size="sm"
        className="mt-10"
        onClick={() => {
          clearUserId()
          router.replace("/onboarding")
        }}
      >
        Start over
      </Button>
    </>
  )
}
