"use client"

import { useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api/client"
import type { MistakeType } from "@/lib/api/types"
import { useApi } from "@/hooks/use-api"
import { ErrorCard } from "@/components/error-card"
import { PageHeader } from "@/components/page-header"
import { PillSelect } from "@/components/pill-select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import MistakeList from "./mistake-list"

const labels: Record<MistakeType, string> = {
  grammar: "Grammar",
  tense: "Tense",
  preposition: "Prepositions",
  word_choice: "Word choice",
  other: "Other",
}

type Filter = "all" | MistakeType

export default function MistakesClient() {
  const { data: summary, error, loading, reload } = useApi(api.mistakeSummary)
  const [filter, setFilter] = useState<Filter>("all")

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mistakes"
        description={
          summary ? `${summary.total} corrections so far` : "Corrections from your conversations."
        }
      />
      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 rounded-full" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : error ? (
        <ErrorCard error={error} onRetry={reload} />
      ) : summary?.total === 0 ? (
        <Card className="rounded-2xl p-5 shadow-none">
          <p className="text-sm text-muted-foreground">
            No corrections yet. Finish a conversation and your mistakes will show up here.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/lessons">Browse lessons</Link>
          </Button>
        </Card>
      ) : summary ? (
        <>
          <PillSelect
            label="Filter by type"
            options={[
              { value: "all", label: "All", count: summary.total },
              ...(Object.keys(labels) as MistakeType[])
                .filter((type) => summary.byType[type] > 0)
                .map((type) => ({ value: type, label: labels[type], count: summary.byType[type] })),
            ]}
            value={filter}
            onChange={setFilter}
          />
          <MistakeList key={filter} type={filter === "all" ? undefined : filter} />
        </>
      ) : null}
    </div>
  )
}
