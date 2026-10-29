"use client"

import { useEffect, useState } from "react"
import type { McqExercise } from "@/lib/api/types"
import { shuffle } from "@/lib/lesson-player"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface McqExerciseProps {
  exercise: McqExercise
  value: string | null
  onChange: (value: string) => void
  disabled?: boolean
  checked?: boolean
}

export function McqExercise({
  exercise,
  value,
  onChange,
  disabled = false,
  checked = false,
}: McqExerciseProps) {
  const [options] = useState(() => shuffle(exercise.options))

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (disabled) return
      const index = Number(event.key) - 1
      const option = options[index]
      if (option) onChange(option)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [disabled, onChange, options])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">{exercise.prompt}</h2>
        {exercise.promptHi ? (
          <p className="mt-2 text-sm text-muted-foreground" lang="hi">
            {exercise.promptHi}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        {options.map((option, index) => (
          <Button
            key={option}
            variant="outline"
            radius="xl"
            disabled={disabled}
            haptic={false}
            className={cn(
              "h-auto justify-start p-4 text-left whitespace-normal",
              !checked && value === option && "border-indigo-400 bg-indigo-400/10",
              checked && option === exercise.correct && "border-emerald-400 bg-emerald-400/10",
              checked && value === option && option !== exercise.correct
                ? "border-rose-400 bg-rose-400/10"
                : null,
              checked && option !== value && option !== exercise.correct && "opacity-60",
            )}
            onClick={() => onChange(option)}
          >
            <span className="mr-3 text-xs text-muted-foreground">{index + 1}</span>
            {option}
          </Button>
        ))}
      </div>
    </div>
  )
}
