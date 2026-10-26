"use client"

import Link from "next/link"
import { useState } from "react"
import type { LessonCategory } from "@/lib/api/types"
import { api } from "@/lib/api/client"
import { useApi } from "@/hooks/use-api"
import { PageHeader } from "@/components/page-header"
import { ErrorCard } from "@/components/error-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const loadLessons = () => api.lessons()
const categories: { label: string; value: LessonCategory | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Daily", value: "daily" },
  { label: "Work", value: "work" },
  { label: "Career", value: "career" },
  { label: "Travel", value: "travel" },
]

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function LessonsClient() {
  const { data, error, loading, reload } = useApi(loadLessons)
  const [selectedCategory, setSelectedCategory] = useState<LessonCategory | undefined>()
  const lessons = data?.filter(
    (lesson) => lesson.category === selectedCategory || !selectedCategory,
  )

  return (
    <>
      <PageHeader title="Lessons" description="Pick a situation and practice it." />
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <Button
            key={category.label}
            size="sm"
            variant={selectedCategory === category.value ? "indigo" : "outline"}
            aria-pressed={selectedCategory === category.value}
            onClick={() => setSelectedCategory(category.value)}
          >
            {category.label}
          </Button>
        ))}
      </div>
      {loading ? (
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-4">
          <ErrorCard error={error} onRetry={reload} />
        </div>
      ) : lessons?.length ? (
        <div className="mt-4 flex animate-in flex-col gap-3 duration-200 fade-in-0 slide-in-from-bottom-1">
          {lessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/lessons/${lesson.id}`}
              className="block rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Card className="gap-2 rounded-2xl py-4 shadow-none transition-colors duration-150 hover:bg-accent/50">
                <CardContent className="flex flex-col gap-2 px-5">
                  <h2 className="text-base font-medium">{lesson.title}</h2>
                  <p className="text-sm text-muted-foreground">{lesson.objective}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{capitalize(lesson.category)}</Badge>
                    <Badge variant="outline">{capitalize(lesson.level)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {lesson.estimatedMinutes} min
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No lessons in this category yet.</p>
      )}
    </>
  )
}
