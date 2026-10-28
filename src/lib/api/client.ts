// The only place that talks to the backend. Components call `api.*`.
// Types come from ./types (generated from the backend API reference).
// Browser-only: the user id lives in localStorage, so call this from client
// components or effects, never during server rendering.

import type {
  ApiErrorResponse,
  AttemptCompleteRequest,
  AttemptResultRequest,
  ConversationEndResponse,
  ConversationGetResponse,
  ConversationStartResponse,
  ConversationTurnResponse,
  HomeResponse,
  Language,
  LessonCategory,
  LessonDetail,
  LessonListItem,
  LessonAttemptResponse,
  Level,
  MistakesListResponse,
  MistakesSummaryResponse,
  MistakeType,
  OnboardingRequest,
  OnboardingResponse,
  SttLanguageCode,
  SttMode,
  SttResponse,
  TtsRequest,
  TtsResponse,
} from "./types"

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"
const USER_ID_KEY = "zubaan:userId"
const NATIVE_LANGUAGE_KEY = "zubaan:nativeLanguage"
export const SESSION_EVENT = "zubaan:session"

function notifySessionChange(): void {
  window.dispatchEvent(new Event(SESSION_EVENT))
}

// ---- Session: the backend identifies users by the x-user-id header ----

export function getUserId(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(USER_ID_KEY)
}

export function setUserId(id: string): void {
  window.localStorage.setItem(USER_ID_KEY, id)
  notifySessionChange()
}

export function clearUserId(): void {
  window.localStorage.removeItem(USER_ID_KEY)
  window.localStorage.removeItem(NATIVE_LANGUAGE_KEY)
  notifySessionChange()
}

export function getNativeLanguage(): Language | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(NATIVE_LANGUAGE_KEY) as Language | null
}

// ---- Errors ----

/** status 0 means the request never reached the server (network error). */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/** User-facing text for any error. Use this instead of writing your own copy. */
export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again."
  switch (error.status) {
    case 0:
      return "Can't reach the server. Check that the backend is running."
    case 401:
      return "Your session expired. Start again from onboarding."
    case 409:
      return "This conversation has ended."
    case 429:
      return "Too many requests. Wait a few seconds and try again."
    case 502:
    case 504:
      return "The AI service didn't respond. Try again."
    default:
      // 400 and 404 messages from the backend are already readable.
      return error.message.trim() || "Something went wrong. Please try again."
  }
}

// ---- Request helper ----

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(init.headers)

  if (authenticated) {
    const userId = getUserId()
    if (!userId) throw new ApiError(401, "Not signed in")
    headers.set("x-user-id", userId)
  }
  // JSON bodies are strings. For FormData the browser sets the multipart boundary itself.
  if (typeof init.body === "string") headers.set("Content-Type", "application/json")

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, "Network error")
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null
    throw new ApiError(response.status, body?.error?.message ?? response.statusText)
  }
  return (await response.json()) as T
}

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value))
  }
  const text = query.toString()
  return text ? `${path}?${text}` : path
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) })

// ---- Endpoints ----

export const api = {
  /** Creates the user and stores the returned userId for later calls. */
  onboard: async (body: OnboardingRequest): Promise<OnboardingResponse> => {
    const result = await request<OnboardingResponse>("/api/onboarding", post(body), false)
    window.localStorage.setItem(NATIVE_LANGUAGE_KEY, result.user.nativeLanguage)
    setUserId(result.userId)
    return result
  },

  home: () => request<HomeResponse>("/api/home"),

  lessons: (filter: { category?: LessonCategory; level?: Level } = {}) =>
    request<LessonListItem[]>(withQuery("/api/lessons", filter)),

  lesson: (id: string) => request<LessonDetail>(`/api/lessons/${id}`),

  startAttempt: (lessonId: string) =>
    request<{ attemptId: string }>(`/api/lessons/${lessonId}/attempts`, { method: "POST" }),

  recordResult: (attemptId: string, body: AttemptResultRequest) =>
    request<void>(`/api/attempts/${attemptId}/results`, post(body)),

  completeAttempt: (attemptId: string, body: AttemptCompleteRequest) =>
    request<LessonAttemptResponse>(`/api/attempts/${attemptId}/complete`, post(body)),

  attempt: (attemptId: string) => request<LessonAttemptResponse>(`/api/attempts/${attemptId}`),

  startConversation: (lessonId: string, options: { attemptId?: string } = {}) =>
    request<ConversationStartResponse>("/api/conversations", post({ lessonId, ...options })),

  takeTurn: (conversationId: string, text: string) =>
    request<ConversationTurnResponse>(`/api/conversations/${conversationId}/turns`, post({ text })),

  endConversation: (conversationId: string) =>
    request<ConversationEndResponse>(`/api/conversations/${conversationId}/end`, {
      method: "POST",
    }),

  conversation: (conversationId: string) =>
    request<ConversationGetResponse>(`/api/conversations/${conversationId}`),

  tts: (body: TtsRequest) => request<TtsResponse>("/api/speech/tts", post(body)),

  /** `audio` must be a WAV blob (16 kHz mono, under 30 seconds). */
  stt: (audio: Blob, options: { language?: SttLanguageCode; mode?: SttMode } = {}) => {
    const form = new FormData()
    form.append("audio", audio, "recording.wav")
    if (options.language) form.append("language", options.language)
    if (options.mode) form.append("mode", options.mode)
    return request<SttResponse>("/api/speech/stt", { method: "POST", body: form })
  },

  mistakes: (query: { type?: MistakeType; limit?: number; before?: string } = {}) =>
    request<MistakesListResponse>(withQuery("/api/mistakes", query)),

  mistakeSummary: () => request<MistakesSummaryResponse>("/api/mistakes/summary"),
}

/** Turns the backend's relative audioUrl into a playable absolute URL. */
export function audioSrc(audioUrl: string | null): string | null {
  return audioUrl ? `${API_URL}${audioUrl}` : null
}
