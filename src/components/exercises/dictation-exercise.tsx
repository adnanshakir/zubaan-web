"use client"

import { useEffect, useRef } from "react"
import { PlayIcon, SquareIcon } from "lucide-react"
import type { DictationExercise } from "@/lib/api/types"
import { usePhrasePlayer } from "@/hooks/use-phrase-player"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface DictationExerciseProps {
  exercise: DictationExercise
  value: string | null
  onChange: (value: string) => void
  disabled?: boolean
  checked?: boolean
}

export function DictationExercise({
  exercise,
  value,
  onChange,
  disabled = false,
}: DictationExerciseProps) {
  const player = usePhrasePlayer()
  const playedOnce = useRef(false)
  const { play, stop } = player
  const playing = player.active?.id === exercise.id

  useEffect(() => {
    if (!playedOnce.current) {
      playedOnce.current = true
      void play(exercise.id, exercise.text)
    }
    return stop
  }, [exercise.id, exercise.text, play, stop])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Listen and type</h2>
        <div className="mt-5 flex items-center gap-3">
          <Button
            variant="indigo"
            size="icon"
            aria-label={playing ? "Stop listening" : "Listen"}
            loading={player.active?.id === exercise.id && player.active.status === "loading"}
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
      <div className="flex flex-col gap-2">
        <Textarea
          rows={2}
          placeholder="Type what you hear"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground">Type what you hear</p>
      </div>
    </div>
  )
}
