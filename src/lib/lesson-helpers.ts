import type { LessonDetail } from "@/lib/api/types"

export function sentenceById(lesson: LessonDetail, id: string) {
  return lesson.sentences.find((sentence) => sentence.id === id)
}

export function turnSentence(lesson: LessonDetail, turnIndex: number): string {
  const turn = lesson.chat.turns[turnIndex]
  return turn ? (sentenceById(lesson, turn.sentenceId)?.text ?? "") : ""
}

export function exerciseCount(lesson: LessonDetail): number {
  return lesson.stages.reduce((total, stage) => total + stage.exercises.length, 0)
}
