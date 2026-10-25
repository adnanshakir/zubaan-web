"use client"

import type { LucideIcon } from "lucide-react"
import { CheckIcon } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"

export interface Option<T extends string> {
  value: T
  label: string
  hint?: string
  icon?: LucideIcon
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
        if (match) {
          haptic.select()
          onChange(match.value)
        }
      }}
      className={cn("grid gap-2", columns === 2 && "grid-cols-2")}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="group/option relative flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors duration-150 hover:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10"
        >
          <RadioGroupItem
            value={option.value}
            className="absolute inset-0 size-full rounded-2xl border-0 opacity-0"
          />
          {option.icon ? (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors duration-150 group-has-[[data-state=checked]]/option:bg-primary/20 group-has-[[data-state=checked]]/option:text-indigo-400">
              <option.icon className="size-4" />
            </span>
          ) : null}
          <span className="flex min-w-0 flex-1 flex-col">
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
