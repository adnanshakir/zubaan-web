export function SpeechLegend() {
  return (
    <div className="flex gap-4 text-xs text-muted-foreground">
      <span>
        <span className="text-emerald-400">Said</span>
      </span>
      <span>
        <span className="text-amber-400 underline decoration-amber-400/70 decoration-dotted underline-offset-4">
          Almost
        </span>
      </span>
      <span>
        <span className="text-rose-400 underline decoration-rose-400/70 decoration-wavy underline-offset-4">
          Missed
        </span>
      </span>
    </div>
  )
}
