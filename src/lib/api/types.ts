// Generated from the backend API reference (section 4.6) by scripts/split-api-doc.mjs.
// Do not edit by hand: update the backend doc, copy it here and re-run the script.

// ── Enums ──────────────────────────────────────────────────

export type Language = "hi" | "ta" | "te" | "mr" | "bn" | "kn" | "ml" | "gu" | "pa" | "or"
export type Level = "beginner" | "elementary" | "intermediate" | "advanced"
export type Goal = "daily_conversation" | "work" | "interviews" | "travel" | "confidence"
export type LessonCategory = "daily" | "work" | "career" | "travel"
export type TtsLanguage = "en-IN" | "hi-IN" | "ta-IN" | "te-IN"
export type TtsProviderName = "kokoro" | "sarvam"
export type SttMode = "transcribe" | "verbatim" | "codemix" | "translit"
export type SttProviderName = "sarvam"
export type ConversationStatus = "active" | "completed" | "abandoned"
export type MessageRole = "user" | "ai"
export type LessonAttemptResultType = "correct" | "wrong" | "said" | "close" | "missed" | "skipped"
export type MistakeKind = "grammar" | "tense" | "preposition" | "word_choice"

export type SttLanguageCode =
  | "unknown"
  | "hi-IN"
  | "bn-IN"
  | "kn-IN"
  | "ml-IN"
  | "mr-IN"
  | "od-IN"
  | "pa-IN"
  | "ta-IN"
  | "te-IN"
  | "en-IN"
  | "gu-IN"
  | "as-IN"
  | "ur-IN"
  | "ne-IN"
  | "kok-IN"
  | "ks-IN"
  | "sd-IN"
  | "sa-IN"
  | "sat-IN"
  | "mni-IN"
  | "brx-IN"
  | "mai-IN"
  | "doi-IN"

// ── Request Bodies ──────────────────────────────────────────

export interface OnboardingRequest {
  nativeLanguage: Language
  goal: Goal
  level: Level
  name?: string // max 50 chars
}

export interface ConversationStartRequest {
  lessonId: string
  attemptId?: string
}

export interface AttemptResultRequest {
  exerciseId: string
  result: LessonAttemptResultType
  answer?: string | string[]
  retry?: boolean
}

export interface AttemptCompleteRequest {
  bestStreak: number // integer, 0–200
}

export interface ConversationTurnRequest {
  text: string // 1–500 chars
}

export interface TtsRequest {
  text: string // 1–2500 chars
  language: TtsLanguage
  provider?: TtsProviderName
  voice?: string // 1–120 chars
  pace?: number // 0.5–2.0
}

export interface SttRequest {
  // multipart: "audio" file field
  language?: SttLanguageCode
  provider?: SttProviderName
  mode?: SttMode
}

// ── Response Bodies ─────────────────────────────────────────

export interface OnboardingResponse {
  userId: string
  user: User
  recommendedLesson: LessonListItem | null
}

export interface HomeResponse {
  greetingName: string
  recommendedLesson: LessonListItem | null
}

export interface LessonListItem {
  id: string
  slug: string
  title: string
  category: LessonCategory
  level: Level
  objective: string
  estimatedMinutes: number
  sentenceCount: number
  exerciseCount: number
}

export interface LessonDetail extends LessonListItem {
  sentences: Sentence[]
  stages: Stage[]
  chat: Chat
}

export interface Sentence {
  id: string
  text: string
  hi: string
  tip: string
  chunks: string[]
}

export interface Stage {
  id: "words" | "sentences"
  title: string
  intro: string
  exercises: Exercise[]
}

export type Exercise =
  | McqExercise
  | GapExercise
  | ListenPickExercise
  | MatchPairsExercise
  | OrderWordsExercise
  | SpeakExercise

export interface McqExercise {
  id: string
  type: "mcq"
  prompt: string
  promptHi?: string
  options: string[]
  correct: string
  explanation: string
  mistakeType?: MistakeKind
}
export interface GapExercise {
  id: string
  type: "gap"
  sentence: string
  hi: string
  options: string[]
  correct: string
  explanation: string
  mistakeType?: MistakeKind
}
export interface ListenPickExercise {
  id: string
  type: "listen_pick"
  prompt: string
  text: string
  options: string[]
  correct: string
  explanation: string
}
export interface MatchPairsExercise {
  id: string
  type: "match_pairs"
  prompt: string
  pairs: { en: string; hi: string }[]
}
export interface OrderWordsExercise {
  id: string
  type: "order_words"
  promptHi: string
  answer: string
  extraWords?: string[]
  explanation: string
  mistakeType?: MistakeKind
}
export interface SpeakExercise {
  id: string
  type: "speak"
  sentenceId: string
}

export interface Chat {
  aiRole: string
  userRole: string
  situation: string
  goal: string
  turns: ChatTurn[]
  closingLine: string
}

export interface ChatTurn {
  ai: string
  sentenceId: string
  hint: { en: string; hi: string }
}

export interface ConversationStartResponse {
  conversationId: string
  attemptId: string | null
  status: ConversationStatus
  messages: ConversationMessage[]
  turnsRemaining: number
}

export interface ConversationTurnResponse {
  reply: string
  audioUrl: string | null
  endConversation: boolean
  turnsRemaining: number
  progress: { current: number; total: number }
  hasMistake: boolean
  corrected: string
  explanation: string
  mistakeType: MistakeType
  correction: Correction | null
  feedback: ConversationFeedback | null
}

export interface ConversationEndResponse {
  conversationId: string
  attemptId: string | null
  status: ConversationStatus
  durationSec: number
  userTurns: number
  feedback: ConversationFeedback
}

export interface ConversationGetResponse {
  conversationId: string
  lessonId: string
  attemptId: string | null
  status: ConversationStatus
  messages: ConversationMessage[]
  startedAt: string // ISO 8601
  endedAt?: string // ISO 8601; present once completed
  durationSec?: number // present once completed
  feedback: ConversationFeedback | null
}

export interface ConversationMessage {
  role: MessageRole
  text: string
  audioUrl: string | null
  correction?: Correction | null // user messages only
  turnIndex: number
  outcome?: "exact" | "close" | "off" | "moved_on" // user messages only
  revealHint?: boolean // AI messages only
  createdAt: string // ISO 8601
}

export type MistakeType = "grammar" | "tense" | "preposition" | "word_choice" | "other"

export interface LessonAttemptResponse {
  attemptId: string
  lessonId: string
  startedAt: string
  completedAt: string | null
  bestStreak: number
  results: Array<{
    exerciseId: string
    stageId: "words" | "sentences"
    type: string
    result: LessonAttemptResultType
    retryResult?: "correct" | "wrong"
  }>
  mistakes: Array<{
    exerciseId: string
    original: string
    corrected: string
    explanation: string
    mistakeType: MistakeKind
  }>
}

export interface Correction {
  corrected: string
  explanation: string
  type: MistakeType
}

export interface MistakeItem {
  id: string
  original: string
  corrected: string
  explanation: string
  type: MistakeType
  conversationId: string
  lessonId: string
  createdAt: string
}

export interface MistakesListResponse {
  items: MistakeItem[]
  nextBefore: string | null
}

export interface MistakesSummaryResponse {
  total: number
  byType: Record<MistakeType, number>
}

export interface FeedbackCorrection {
  original: string
  corrected: string
  explanation: string
  type: MistakeType
}

export interface ConversationFeedback {
  userTurns: number
  durationSec: number | null
  mistakeCount: number
  corrections: FeedbackCorrection[]
  targetPhrases: { used: string[]; missed: string[] }
}

export interface TtsResponse {
  audioUrl: string
  provider: TtsProviderName
  voice: string
  pace: number | null
  chars: number
  totalMs: number
  durationMs: number | null
  cached: boolean
}

export interface SttResponse {
  text: string
  languageCode: string | null
  provider: SttProviderName
  mode: SttMode
  totalMs: number
  durationSeconds: number | null
}

export interface ApiErrorResponse {
  error: {
    message: string
  }
}

export interface HealthResponse {
  success: boolean
  message: string
}

// ── Internal (not directly in API but part of User) ─────────

export interface User {
  _id: string
  name?: string
  nativeLanguage: Language
  level: Level
  goal: Goal
  dailyGoalMinutes: number
  placement: {
    selfReported: Level
    measured?: Level
  }
  createdAt: string
  updatedAt: string
}
