"use client"

import { CheckIcon } from "lucide-react"
import { useState } from "react"
import type { MatchPairsExercise } from "@/lib/api/types"
import { haptic } from "@/lib/haptics"
import { shuffleColumns } from "@/lib/lesson-player"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface MatchPairsExerciseProps {
  exercise: MatchPairsExercise
  onResult: (correct: boolean) => void
}

export function MatchPairsExercise({ exercise, onResult }: MatchPairsExerciseProps) {
  const [{ left: leftItems, right: rightItems }] = useState(() => shuffleColumns(exercise.pairs))
  const [left, setLeft] = useState<string | null>(null)
  const [right, setRight] = useState<string | null>(null)
  const [matched, setMatched] = useState<string[]>([])
  const [wrong, setWrong] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)

  function chooseLeft(value: string) {
    if (!matched.includes(value)) {
      haptic.select()
      setLeft(value)
      if (right) tryPair(value, right)
    }
  }

  function chooseRight(value: string) {
    if (!matched.some((item) => rightItems.find((pair) => pair.en === item)?.hi === value)) {
      haptic.select()
      setRight(value)
      if (left) tryPair(left, value)
    }
  }

  function tryPair(leftValue: string, rightValue: string) {
    const pair = exercise.pairs.find((item) => item.en === leftValue)
    if (pair?.hi === rightValue) {
      haptic.success()
      const nextMatched = [...matched, leftValue]
      setMatched(nextMatched)
      setLeft(null)
      setRight(null)
      if (nextMatched.length === exercise.pairs.length) onResult(mistakes === 0)
    } else {
      haptic.error()
      setMistakes((count) => count + 1)
      setWrong([leftValue, rightValue])
      window.setTimeout(() => {
        setWrong([])
        setLeft(null)
        setRight(null)
      }, 500)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">{exercise.prompt}</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          {leftItems.map((pair) => (
            <Button
              key={pair.en}
              variant="outline"
              radius="xl"
              haptic={false}
              disabled={matched.includes(pair.en)}
              className={cn(
                "h-auto min-h-12 p-3 text-left whitespace-normal",
                matched.includes(pair.en) && "border-emerald-400 bg-emerald-400/10",
                wrong.includes(pair.en) && "animate-shake border-rose-400 bg-rose-400/10",
                left === pair.en &&
                  !wrong.includes(pair.en) &&
                  "border-indigo-400 bg-indigo-400/10",
              )}
              onClick={() => chooseLeft(pair.en)}
            >
              <span className="flex items-center gap-2">
                {matched.includes(pair.en) ? <CheckIcon className="size-4" /> : null}
                {pair.en}
              </span>
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {rightItems.map((pair) => {
            const isMatched = matched.some((item) => item === pair.en)
            return (
              <Button
                key={pair.hi}
                variant="outline"
                radius="xl"
                haptic={false}
                disabled={isMatched}
                className={cn(
                  "h-auto min-h-12 p-3 text-left whitespace-normal",
                  isMatched && "border-emerald-400 bg-emerald-400/10",
                  wrong.includes(pair.hi) && "animate-shake border-rose-400 bg-rose-400/10",
                  right === pair.hi &&
                    !wrong.includes(pair.hi) &&
                    "border-indigo-400 bg-indigo-400/10",
                )}
                onClick={() => chooseRight(pair.hi)}
              >
                <span className="flex items-center gap-2">
                  {isMatched ? <CheckIcon className="size-4" /> : null}
                  {pair.hi}
                </span>
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
