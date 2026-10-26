"use client"

import { Button } from "@/components/ui/button"

export interface PillOption<T extends string> {
  value: T
  label: string
  count?: number
  disabled?: boolean
}

interface PillSelectProps<T extends string> {
  label: string
  options: readonly PillOption<T>[]
  value: T
  onChange: (value: T) => void
}

/** A row of pill buttons where exactly one is selected. */
export function PillSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: PillSelectProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex gap-2 overflow-x-auto pb-1">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Button
            key={option.value}
            size="sm"
            variant={selected ? "indigo" : "outline"}
            aria-pressed={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={selected ? "opacity-80" : "text-muted-foreground"}>
                {option.count}
              </span>
            ) : null}
          </Button>
        )
      })}
    </div>
  )
}
