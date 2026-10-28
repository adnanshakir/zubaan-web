"use client"

import { useEffect, useState } from "react"
import { PlayIcon, SquareIcon } from "lucide-react"
import type { ListenPickExercise } from "@/lib/api/types"
import { shuffle } from "@/lib/lesson-player"
import { usePhrasePlayer } from "@/hooks/use-phrase-player"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ListenPickExerciseProps {
  exercise: ListenPickExercise
  value: string | null
  onChange: (value: string) => void
  disabled?: boolean
}

export function ListenPickExercise({
  exercise,
  value,
  onChange,
  disabled = false,
}: ListenPickExerciseProps) {
  const player = usePhrasePlayer()
  const [options] = useState(() => shuffle(exercise.options))
  const { play, stop } = player
  const playing = player.active?.id === exercise.id

  useEffect(() => {
    void play(exercise.id, exercise.text)
    return stop
  }, [exercise.id, exercise.text, play, stop])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">{exercise.prompt}</h2>
        <div className="mt-5 flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label={playing ? "Stop listening" : "Listen"}
            onClick={() => (playing ? player.stop() : void player.play(exercise.id, exercise.text))}
          >
            {playing ? <SquareIcon /> : <PlayIcon />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void player.play(exercise.id, exercise.text, 0.7)}
          >
            Slow
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {options.map((option) => (
          <Button
            key={option}
            variant="outline"
            radius="xl"
            disabled={disabled}
            haptic={false}
            className={cn(
              "h-auto justify-start p-4 text-left whitespace-normal",
              value === option && "border-indigo-400 bg-indigo-400/10",
            )}
            onClick={() => onChange(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  )
}
