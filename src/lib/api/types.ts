// Generated from the backend API reference (section 4.6) by scripts/split-api-doc.mjs.
// Do not edit by hand: update the backend doc, copy it here and re-run the script.

// ── Enums ──────────────────────────────────────────────────

export type Language = "hi" | "ta" | "te" | "mr" | "bn" | "kn" | "ml" | "gu" | "pa" | "or"
export type Level = "beginner" | "elementary" | "intermediate" | "advanced"
export type Goal = "daily_conversation" | "work" | "interviews" | "travel" | "confidence"
export type LessonCategory = "daily" | "work" | "career" | "travel"
export type TtsLanguage = "en-IN" | "hi-IN" | "ta-IN" | "te-IN"
export type TtsProviderName = "kokoro" | "sarvam"
export type SttProviderName = "sarvam"
export type ConversationStatus = "active" | "completed" | "abandoned"
export type MessageRole = "user" | "ai"

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
}

export interface LessonDetail extends LessonListItem {
  steps: LessonStep[]
}

export interface LessonStep {
  order: number
  type: "learn" | "repeat" | "roleplay"
  phrases?: LessonPhrase[]
  phraseIndexes?: number[]
  roleplay?: RoleplayStep
}

export interface LessonPhrase {
  text: string
  hints: Partial<Record<Language, string>>
  tip?: string | null
}

export interface RoleplayStep {
  aiRole: string
  userRole: string
  situation: string
  goal: string
  openingLine: string
  maxTurns: number
  targetPhrases: string[]
}

export interface ConversationStartResponse {
  conversationId: string
  status: ConversationStatus
  messages: ConversationMessage[]
  turnsRemaining: number
}

export interface ConversationTurnResponse {
  reply: string
  audioUrl: string | null
  endConversation: boolean
  turnsRemaining: number
  correction: Correction | null
  feedback: ConversationFeedback | null
}

export interface ConversationEndResponse {
  conversationId: string
  status: ConversationStatus
  durationSec: number
  userTurns: number
  feedback: ConversationFeedback
}

export interface ConversationGetResponse {
  conversationId: string
  lessonId: string
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
  createdAt: string // ISO 8601
}

export type MistakeType = "grammar" | "tense" | "preposition" | "word_choice" | "other"

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
