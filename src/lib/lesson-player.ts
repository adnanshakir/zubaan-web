import type { Exercise } from "@/lib/api/types"

export interface QueueItem {
  exercise: Exercise
  retried: boolean
}

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function isCorrect(exercise: Exercise, answer: string | string[]): boolean {
  if (exercise.type === "mcq" || exercise.type === "gap" || exercise.type === "listen_pick") {
    return typeof answer === "string" && answer === exercise.correct
  }

  if (exercise.type === "order_words") {
    return (
      Array.isArray(answer) &&
      answer.length === exercise.answer.split(" ").length &&
      answer.every((word, index) => word === exercise.answer.split(" ")[index])
    )
  }

  return false
}

export function buildQueue(exercises: readonly Exercise[]): QueueItem[] {
  return exercises.map((exercise) => ({ exercise, retried: false }))
}

export function requeueWrong(queue: readonly QueueItem[], item: QueueItem): QueueItem[] {
  if (item.retried || item.exercise.type === "speak" || item.exercise.type === "match_pairs") {
    return [...queue]
  }
  return [...queue, { exercise: item.exercise, retried: true }]
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
