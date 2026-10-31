"use client"

import { useCallback, useEffect, useRef } from "react"
import type { TypeGapExercise } from "@/lib/api/types"
import { Input } from "@/components/ui/input"

interface TypeGapExerciseProps {
  exercise: TypeGapExercise
  value: string | null
  onChange: (value: string) => void
  disabled?: boolean
  checked?: boolean
  onEnter?: () => void
}

export function TypeGapExercise({
  exercise,
  value,
  onChange,
  disabled = false,
  onEnter,
}: TypeGapExerciseProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const parts = exercise.sentence.split("___")

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" && onEnter) {
        event.preventDefault()
        onEnter()
      }
    },
    [onEnter],
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [exercise.id])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xl font-semibold">
          {parts[0]}
          <Input
            ref={inputRef}
            className="mx-1 inline-block w-28 text-center align-baseline"
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {parts.slice(1).join("___")}
        </p>
        <p className="mt-2 text-sm text-muted-foreground" lang="hi">
          {exercise.hi}
        </p>
      </div>
    </div>
  )
}
