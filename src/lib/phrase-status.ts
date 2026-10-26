import { matchSpeech, type MatchResult } from "@/lib/speech-match"

export type PhraseStatus = "said" | "close" | "none"

/** Best result for one target phrase across everything the learner said. */
export function phraseStatus(phrase: string, spoken: readonly string[]): PhraseStatus {
  let best: PhraseStatus = "none"
  for (const text of spoken) {
    const verdict = matchSpeech(phrase, text).verdict
    if (verdict === "said") return "said"
    if (verdict === "close") best = "close"
  }
  return best
}

export function bestAttempt(
  phrase: string,
  spoken: readonly string[],
): { match: MatchResult; text: string } | null {
  let best: { match: MatchResult; text: string } | null = null
  for (const text of spoken) {
    const match = matchSpeech(phrase, text)
    if (!best || match.score > best.match.score) best = { match, text }
  }
  return best
}
