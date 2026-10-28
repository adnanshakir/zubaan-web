import type { Exercise } from "@/lib/api/types"

export interface QueueItem {
  exercise: Exercise
  retried: boolean
}

export interface Tile {
  id: string
  label: string
}

export interface RetryPlan {
  queue: QueueItem[]
  review: QueueItem[]
}

export interface ColumnPair {
  en: string
  hi: string
}

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}']+/u, "")
    .replace(/[^\p{L}\p{N}']+$/u, "")
}

function stripWordPunctuation(word: string): string {
  return word.replace(/^[^\p{L}\p{N}']+/u, "").replace(/[^\p{L}\p{N}']+$/u, "")
}

export function buildTiles(answer: string, extraWords: readonly string[] = []): Tile[] {
  const answerWords = answer.split(" ")
  const answerTiles = answerWords.map((word, index) => {
    const label = stripWordPunctuation(word)
    const firstLabel =
      index === 0 && label !== "I" && !label.startsWith("I'") ? label.toLowerCase() : label
    return { id: `answer-${index}`, label: firstLabel }
  })
  const extraTiles = extraWords.map((word, index) => ({
    id: `extra-${index}`,
    label: stripWordPunctuation(word),
  }))
  return [...answerTiles, ...extraTiles]
}

export function isCorrect(exercise: Exercise, answer: string | string[]): boolean {
  if (exercise.type === "mcq" || exercise.type === "gap" || exercise.type === "listen_pick") {
    return typeof answer === "string" && answer === exercise.correct
  }

  if (exercise.type === "order_words") {
    const expected = exercise.answer.split(" ").map(normalizeWord)
    return (
      Array.isArray(answer) &&
      answer.length === expected.length &&
      answer.map(normalizeWord).every((word, index) => word === expected[index])
    )
  }

  return false
}

export function buildQueue(exercises: readonly Exercise[]): QueueItem[] {
  return exercises.map((exercise) => ({ exercise, retried: false }))
}

export function shuffleColumns<T extends ColumnPair>(
  pairs: readonly T[],
  random = Math.random,
): { left: T[]; right: T[] } {
  const left = shuffle(pairs, random)
  let right = shuffle(pairs, random)
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (left.every((pair, index) => pair !== right[index])) return { left, right }
    right = shuffle(pairs, random)
  }
  if (right.length > 1) right = [...right.slice(1), right[0]]
  return { left, right }
}

export function scheduleRetry(
  plan: RetryPlan,
  position: number,
  item: QueueItem,
  gap = 3,
): RetryPlan {
  if (item.retried || item.exercise.type === "speak" || item.exercise.type === "match_pairs") {
    return plan
  }
  const retriedItem = { ...item, retried: true }
  const target = position + 1 + gap
  if (target <= plan.queue.length) {
    return {
      queue: [...plan.queue.slice(0, target), retriedItem, ...plan.queue.slice(target)],
      review: plan.review,
    }
  }
  return { queue: plan.queue, review: [...plan.review, retriedItem] }
}

export function streakAfter(
  streak: number,
  result: "correct" | "said" | "close" | "wrong" | "missed" | "skipped",
  retry: boolean,
): number {
  if (retry || result === "skipped") return streak
  if (result === "correct" || result === "said" || result === "close") return streak + 1
  return 0
}

export function streakMilestone(streak: number): string | null {
  if (streak === 3) return "3 in a row"
  if (streak === 5) return "5 in a row, nice!"
  if (streak === 8) return "8 in a row!"
  if (streak === 12) return "12 in a row, on fire!"
  return null
}

export function stageStats(results: Readonly<Record<string, boolean>>): {
  firstTry: number
  total: number
} {
  const outcomes = Object.values(results)
  return {
    firstTry: outcomes.filter(Boolean).length,
    total: outcomes.length,
  }
}
