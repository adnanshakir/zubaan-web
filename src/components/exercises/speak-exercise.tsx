"use client"

import { LightbulbIcon } from "lucide-react"
import type { Sentence, SpeakExercise } from "@/lib/api/types"
import { usePhrasePlayer } from "@/hooks/use-phrase-player"
import { Button } from "@/components/ui/button"
import { PhrasePractice } from "@/components/phrase-practice"

interface SpeakExerciseProps {
  exercise: SpeakExercise
  sentence: Sentence
  onResult: (correct: boolean) => void
  onSkip?: () => void
}

export function SpeakExercise({ exercise, sentence, onResult, onSkip }: SpeakExerciseProps) {
  const player = usePhrasePlayer()
  return (
    <div className="flex flex-col gap-5" data-exercise-id={exercise.id}>
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xl font-semibold">{sentence.text}</p>
        <p className="mt-2 text-sm text-muted-foreground" lang="hi">
          {sentence.hi}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {sentence.chunks.map((chunk) => (
            <span key={chunk} className="rounded-full bg-muted px-3 py-1 text-xs">
              {chunk}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <LightbulbIcon className="size-4 text-amber-400" />
          <span>{sentence.tip}</span>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void player.play(sentence.id, sentence.text)}
          >
            Listen
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void player.play(sentence.id, sentence.text, 0.7)}
          >
            Slow
          </Button>
        </div>
      </div>
      <PhrasePractice
        phrases={[{ id: sentence.id, text: sentence.text }]}
        player={player}
        onVerdict={(_, verdict) => onResult(verdict !== "missed")}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onSkip?.()
          onResult(true)
        }}
      >
        Skip
      </Button>
    </div>
  )
}
