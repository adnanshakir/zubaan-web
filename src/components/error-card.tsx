"use client"

import { describeError } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ErrorCardProps {
  error: unknown
  onRetry: () => void
}

export function ErrorCard({ error, onRetry }: ErrorCardProps) {
  return (
    <Card className="rounded-2xl p-5 shadow-none">
      <p className="text-sm text-muted-foreground">{describeError(error)}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
        Try again
      </Button>
    </Card>
  )
}
