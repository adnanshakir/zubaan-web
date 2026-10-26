// A single 0-100 score for the summary screen, from two things the learner controls:
// how well they said the target phrases, and how many turns needed no correction.

export type ScorePhraseStatus = "said" | "close" | "none"

const PHRASE_WEIGHT = 0.6
const CLEAN_TURN_WEIGHT = 0.4
const CLOSE_PHRASE_CREDIT = 0.5

export interface ScoreInput {
  phrases: readonly ScorePhraseStatus[]
  userTurns: number
  /** Turns whose message had no correction. */
  cleanTurns: number
}

export function sessionScore({ phrases, userTurns, cleanTurns }: ScoreInput): number {
  const phrasePoints = phrases.reduce(
    (sum, status) => sum + (status === "said" ? 1 : status === "close" ? CLOSE_PHRASE_CREDIT : 0),
    0,
  )
  const phraseScore = phrases.length === 0 ? 1 : phrasePoints / phrases.length
  const cleanScore = userTurns === 0 ? 0 : cleanTurns / userTurns
  return Math.round(100 * (PHRASE_WEIGHT * phraseScore + CLEAN_TURN_WEIGHT * cleanScore))
}

export function scoreLabel(score: number): string {
  if (score >= 85) return "Excellent"
  if (score >= 65) return "Good job"
  if (score >= 40) return "Getting there"
  return "Keep practising"
}
