// Compares a target sentence with a speech-to-text transcript, word by word.
//
//   match  -> the word was heard (green)
//   close  -> something similar was heard, e.g. "move" for "moved" (amber)
//   missed -> the word was not heard (red)
//
// This is NOT pronunciation scoring. The recogniser guesses the nearest real
// word, so a badly pronounced word usually shows up as a different word.
// That is what "close" and "missed" capture.

export type WordStatus = "match" | "close" | "missed"
export type Verdict = "said" | "close" | "missed"

export interface TargetWord {
  /** The word as written in the target sentence (with its punctuation). */
  text: string
  status: WordStatus
  /** What was heard instead, only for "close" words. */
  heard: string | null
}

export interface MatchResult {
  words: TargetWord[]
  /** 0 to 1: matches count 1, close words count 0.5. */
  score: number
  verdict: Verdict
}

const CLOSE_SIMILARITY = 0.6 // how alike two words must be to count as "close"
const SAID_SCORE = 0.85
const CLOSE_SCORE = 0.5
const EXTRA_WORD_PENALTY = 0.5 // heard words that are not in the target
const MISSED_WORD_PENALTY = 1

const NEGATIVE_SUFFIXES = [["n't", "not"]] as const
const SHORT_FORMS: ReadonlyArray<readonly [string, string]> = [
  ["'m", "am"],
  ["'re", "are"],
  ["'ve", "have"],
  ["'ll", "will"],
  ["'d", "would"],
]

/** "I'm" -> ["i", "am"], so "I am" and "I'm" compare as equal. */
function expandContraction(word: string): string[] {
  if (word === "can't") return ["can", "not"]
  if (word === "won't") return ["will", "not"]
  if (word === "let's") return ["let", "us"]
  for (const [suffix, full] of [...NEGATIVE_SUFFIXES, ...SHORT_FORMS]) {
    if (word.endsWith(suffix) && word.length > suffix.length) {
      return [word.slice(0, -suffix.length), full]
    }
  }
  if (/^(it|that|there|he|she|what|who|where|here)'s$/.test(word)) {
    return [word.slice(0, -2), "is"]
  }
  return [word]
}

/** British and American spellings compare as equal: neighbour/neighbor, organise/organize. */
function unifySpelling(word: string): string {
  return word
    .replace(/(\p{L}{2,})our(ite|s|ed|ing|y)?$/u, "$1or$2")
    .replace(/(\p{L}{3,})is(e|es|ed|ing)$/u, "$1iz$2")
}

function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{M}\p{N}']/gu, "")
    .replace(/^'+|'+$/g, "")
}

interface Token {
  norm: string
  /** Index of the written word this token came from. */
  word: number
}

function tokenise(words: readonly string[]): Token[] {
  const tokens: Token[] = []
  words.forEach((raw, word) => {
    const base = normalizeWord(raw)
    if (base === "") return // punctuation only
    for (const part of expandContraction(base)) {
      tokens.push({ norm: unifySpelling(part), word })
    }
  })
  return tokens
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1))
      diagonal = above
    }
  }
  return row[b.length]
}

function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length)
  return longest === 0 ? 1 : 1 - levenshtein(a, b) / longest
}

/** 2 = same word, 1 = similar word, -1 = different word. */
function pairScore(target: string, heard: string): number {
  if (target === heard) return 2
  return similarity(target, heard) >= CLOSE_SIMILARITY ? 1 : -1
}

/** "said" needs a high score AND no word missed, so a red word never sits under a green verdict. */
function verdictFor(score: number, anyMissed: boolean): Verdict {
  if (score >= SAID_SCORE && !anyMissed) return "said"
  if (score >= CLOSE_SCORE) return "close"
  return "missed"
}

/**
 * Aligns the target with the transcript (a semi-global alignment): extra words
 * the learner said before or after the target are free, so a phrase said inside
 * a longer sentence still matches.
 */
export function matchSpeech(target: string, transcript: string): MatchResult {
  const written = target.split(/\s+/).filter(Boolean)
  const targetTokens = tokenise(written)
  const heardTokens = tokenise(transcript.split(/\s+/).filter(Boolean))
  const n = targetTokens.length
  const m = heardTokens.length

  const words: TargetWord[] = written.map((text) => ({ text, status: "match", heard: null }))
  if (n === 0) return { words, score: 1, verdict: "said" }

  // score[i][j]: best alignment of the first i target tokens with a transcript
  // that ends at heard token j. Row 0 is all zeros: leading heard words are free.
  const score: number[][] = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: m + 1 }, () => (i === 0 ? 0 : -i * MISSED_WORD_PENALTY)),
  )
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      score[i][j] = Math.max(
        score[i - 1][j - 1] + pairScore(targetTokens[i - 1].norm, heardTokens[j - 1].norm),
        score[i - 1][j] - MISSED_WORD_PENALTY,
        score[i][j - 1] - EXTRA_WORD_PENALTY,
      )
    }
  }

  // Trailing heard words are free too: start from the best end position.
  let end = 0
  for (let j = 1; j <= m; j += 1) {
    if (score[n][j] > score[n][end]) end = j
  }

  const status: WordStatus[] = Array.from({ length: n }, () => "missed")
  const heard: Array<string | null> = Array.from({ length: n }, () => null)
  let i = n
  let j = end
  while (i > 0) {
    const here = score[i][j]
    if (j > 0) {
      const pair = pairScore(targetTokens[i - 1].norm, heardTokens[j - 1].norm)
      if (here === score[i - 1][j - 1] + pair) {
        if (pair === 2) status[i - 1] = "match"
        if (pair === 1) {
          status[i - 1] = "close"
          heard[i - 1] = heardTokens[j - 1].norm
        }
        i -= 1
        j -= 1
        continue
      }
    }
    if (here === score[i - 1][j] - MISSED_WORD_PENALTY) {
      i -= 1 // this target word was not heard
      continue
    }
    j -= 1 // an extra heard word
  }

  // Fold token results back onto the written words ("I'm" has two tokens).
  targetTokens.forEach((token, index) => {
    const word = words[token.word]
    if (status[index] === "missed") {
      word.status = "missed"
      word.heard = null
    } else if (status[index] === "close" && word.status !== "missed") {
      word.status = "close"
      word.heard = heard[index]
    }
  })

  const points = status.reduce((sum, s) => sum + (s === "match" ? 1 : s === "close" ? 0.5 : 0), 0)
  const finalScore = points / n
  return { words, score: finalScore, verdict: verdictFor(finalScore, status.includes("missed")) }
}
