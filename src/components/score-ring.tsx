"use client"

import { useEffect, useState } from "react"
import { TextMorph } from "torph/react"

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** A ring that fills to `score` (0-100) with the number morphing up to it. */
export function ScoreRing({ score, label }: { score: number; label: string }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    // Start from zero, then move on the next frame so the CSS transition has something to animate.
    const frame = requestAnimationFrame(() => setShown(score))
    return () => cancelAnimationFrame(frame)
  }, [score])

  return (
    <div
      className="relative flex size-40 items-center justify-center"
      role="img"
      aria-label={`${score} out of 100, ${label}`}
    >
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="stroke-indigo-500 transition-[stroke-dashoffset] duration-700 ease-[var(--ease-out-soft)] motion-reduce:transition-none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - shown / 100)}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-semibold tracking-tight">
          <TextMorph>{String(shown)}</TextMorph>
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
