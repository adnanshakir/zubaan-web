import type { TargetWord } from "@/lib/speech-match"
import { cn } from "@/lib/utils"

const WORD_STYLES = {
  match: "text-emerald-400",
  close: "text-amber-400 underline decoration-dotted decoration-amber-400/70 underline-offset-4",
  missed: "text-rose-400 underline decoration-wavy decoration-rose-400/70 underline-offset-4",
} as const

const WORD_LABELS = { match: "said", close: "almost", missed: "missed" } as const

/** A sentence whose words are colored by how they were heard. */
export function ColoredSentence({
  words,
  className,
}: {
  words: readonly TargetWord[]
  className?: string
}) {
  return (
    <p className={cn("text-base leading-relaxed font-medium", className)}>
      {words.map((word, index) => (
        <span key={`${word.text}-${index}`}>
          <span
            className={WORD_STYLES[word.status]}
            title={word.status === "close" && word.heard ? `Heard "${word.heard}"` : undefined}
          >
            <span className="sr-only">{`${word.text}, ${WORD_LABELS[word.status]}. `}</span>
            <span aria-hidden>{word.text}</span>
          </span>{" "}
        </span>
      ))}
    </p>
  )
}
