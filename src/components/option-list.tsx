"use client"

import { CheckIcon } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

export interface Option<T extends string> {
  value: T
  label: string
  hint?: string
}

interface OptionListProps<T extends string> {
  label: string
  options: readonly Option<T>[]
  value: T | null
  onChange: (value: T) => void
  columns?: 1 | 2
}

export function OptionList<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 1,
}: OptionListProps<T>) {
  return (
    <RadioGroup
      aria-label={label}
      value={value ?? ""}
      onValueChange={(next) => {
        const match = options.find((option) => option.value === next)
        if (match) onChange(match.value)
      }}
      className={cn("grid gap-2", columns === 2 && "grid-cols-2")}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="group/option flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors duration-150 hover:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10"
        >
          <RadioGroupItem value={option.value} className="sr-only" />
          <span className="flex flex-col">
            <span className="text-sm font-medium">{option.label}</span>
            {option.hint ? (
              <span className="text-xs text-muted-foreground">{option.hint}</span>
            ) : null}
          </span>
          <CheckIcon className="size-4 shrink-0 text-indigo-400 opacity-0 transition-opacity duration-150 group-has-[[data-state=checked]]/option:opacity-100" />
        </label>
      ))}
    </RadioGroup>
  )
}
