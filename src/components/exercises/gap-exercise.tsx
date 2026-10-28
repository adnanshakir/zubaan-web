import type { GapExercise } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface GapExerciseProps {
  exercise: GapExercise
  value: string | null
  onChange: (value: string) => void
  disabled?: boolean
}

export function GapExercise({ exercise, value, onChange, disabled = false }: GapExerciseProps) {
  const parts = exercise.sentence.split("___")
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xl font-semibold">
          {parts[0]}
          <span className="mx-1 inline-block min-w-16 border-b-2 border-indigo-400 text-center">
            {value ?? "\u00a0"}
          </span>
          {parts.slice(1).join("___")}
        </p>
        <p className="mt-2 text-sm text-muted-foreground" lang="hi">
          {exercise.hi}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {exercise.options.map((option) => (
          <Button
            key={option}
            variant="outline"
            radius="full"
            disabled={disabled}
            haptic={false}
            className={cn(value === option && "border-indigo-400 bg-indigo-400/10")}
            onClick={() => onChange(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  )
}
