import type { ConversationGetResponse, LessonAttemptResponse, LessonDetail } from "@/lib/api/types"

export interface Component {
  earned: number
  possible: number
}

export interface LessonScoreInput {
  words: Component | null
  sentences: Component | null
  speaking: Component | null
  chat: Component | null
}

export interface PhraseScore {
  phrase: string
  text: string | null
  outcome: "exact" | "close" | "off" | "moved_on" | null
}

export interface LessonSummary {
  input: LessonScoreInput
  skipped: number
  firstTryCorrect: number
  firstTryTotal: number
  perPhrase: PhraseScore[]
}

export function lessonScore(input: LessonScoreInput): number {
  const weighted = [
    [input.words, 0.14],
    [input.sentences, 0.25],
    [input.speaking, 0.21],
    [input.chat, 0.4],
  ] as const
  const available = weighted.filter(([component]) => component !== null && component.possible > 0)
  if (available.length === 0) return 0
  const weightTotal = available.reduce((sum, [, weight]) => sum + weight, 0)
  return Math.round(
    100 *
      available.reduce(
        (sum, [component, weight]) =>
          sum + (weight / weightTotal) * ((component?.earned ?? 0) / (component?.possible ?? 1)),
        0,
      ),
  )
}

export function summarize(
  lesson: LessonDetail,
  attempt: LessonAttemptResponse | null,
  conversation: ConversationGetResponse,
): LessonSummary {
  const resultById = new Map(attempt?.results.map((result) => [result.exerciseId, result]) ?? [])
  const wordsExercises = lesson.stages.find((stage) => stage.id === "words")?.exercises ?? []
  const sentenceExercises = lesson.stages.find((stage) => stage.id === "sentences")?.exercises ?? []
  const speakingExercises = sentenceExercises.filter((exercise) => exercise.type === "speak")

  const component = (
    exercises: typeof wordsExercises,
    predicate: (exercise: (typeof wordsExercises)[number]) => boolean,
  ): Component | null => {
    if (!attempt) return null
    const counted = exercises.filter(predicate)
    return {
      possible: counted.length,
      earned: counted.filter((exercise) => resultById.get(exercise.id)?.result === "correct")
        .length,
    }
  }

  const speaking: Component | null = attempt
    ? {
        possible: speakingExercises.length,
        earned: speakingExercises.reduce((sum, exercise) => {
          const result = resultById.get(exercise.id)?.result
          return sum + (result === "said" ? 1 : result === "close" ? 0.6 : 0)
        }, 0),
      }
    : null

  const userMessages = conversation.messages.filter((message) => message.role === "user")
  const perPhrase = lesson.chat.turns.map((turn, turnIndex) => {
    const message = userMessages.find((candidate) => candidate.turnIndex === turnIndex)
    return {
      phrase: lesson.sentences.find((sentence) => sentence.id === turn.sentenceId)?.text ?? "",
      text: message?.text ?? null,
      outcome: message?.outcome ?? null,
    }
  })
  const chat = {
    possible: lesson.chat.turns.length,
    earned: perPhrase.reduce(
      (sum, phrase) =>
        sum + (phrase.outcome === "exact" ? 1 : phrase.outcome === "close" ? 0.7 : 0),
      0,
    ),
  }
  const nonSpeak = lesson.stages.flatMap((stage) =>
    stage.exercises.filter((exercise) => exercise.type !== "speak"),
  )
  const firstTryResults = nonSpeak
    .map((exercise) => resultById.get(exercise.id))
    .filter((result) => result !== undefined)
  const skipped =
    (attempt?.results.filter((result) => result.type === "speak" && result.result === "skipped")
      .length ?? 0) + perPhrase.filter((phrase) => phrase.outcome === "moved_on").length

  return {
    input: {
      words: component(wordsExercises, (exercise) => exercise.type !== "speak"),
      sentences: component(sentenceExercises, (exercise) => exercise.type !== "speak"),
      speaking,
      chat,
    },
    skipped,
    firstTryCorrect: firstTryResults.filter((result) => result.result === "correct").length,
    firstTryTotal: attempt ? nonSpeak.length : 0,
    perPhrase,
  }
}
