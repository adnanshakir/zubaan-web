"use client"

import { useState } from "react"
import type { OrderWordsExercise } from "@/lib/api/types"
import { shuffle } from "@/lib/lesson-player"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface OrderWordsExerciseProps {
  exercise: OrderWordsExercise
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}

export function OrderWordsExercise({
  exercise,
  value,
  onChange,
  disabled = false,
}: OrderWordsExerciseProps) {
  const [tiles] = useState(() =>
    shuffle([...exercise.answer.split(" "), ...(exercise.extraWords ?? [])]),
  )
  const [selected, setSelected] = useState<number[]>([])

  function choose(index: number) {
    if (disabled || selected.includes(index)) return
    const next = [...selected, index]
    setSelected(next)
    onChange(next.map((tileIndex) => tiles[tileIndex]))
  }

  function remove(index: number) {
    if (disabled) return
    const next = selected.filter((tileIndex) => tileIndex !== index)
    setSelected(next)
    onChange(next.map((tileIndex) => tiles[tileIndex]))
  }

  const selectedWords =
    value.length === selected.length ? value : selected.map((tileIndex) => tiles[tileIndex])

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground" lang="hi">
        {exercise.promptHi}
      </p>
      <div className="flex min-h-14 flex-wrap items-center gap-2 border-b border-border pb-3">
        {selected.map((tileIndex, answerIndex) => (
          <Button
            key={tileIndex}
            variant="outline"
            radius="full"
            disabled={disabled}
            haptic={false}
            className="border-indigo-400 bg-indigo-400/10"
            onClick={() => remove(tileIndex)}
          >
            {selectedWords[answerIndex]}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {tiles.map((tile, index) => (
          <Button
            key={`${tile}-${index}`}
            variant="outline"
            radius="full"
            disabled={disabled || selected.includes(index)}
            haptic={false}
            className={cn(selected.includes(index) && "opacity-40")}
            onClick={() => choose(index)}
          >
            {tile}
          </Button>
        ))}
      </div>
    </div>
  )
}
