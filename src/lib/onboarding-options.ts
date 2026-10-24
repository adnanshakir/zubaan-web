import type { Goal, Language, Level } from "@/lib/api/types"
import type { Option } from "@/components/option-list"

export const LANGUAGES: readonly Option<Language>[] = [
  { value: "hi", label: "Hindi", hint: "हिन्दी" },
  { value: "ta", label: "Tamil", hint: "தமிழ்" },
  { value: "te", label: "Telugu", hint: "తెలుగు" },
  { value: "mr", label: "Marathi", hint: "मराठी" },
  { value: "bn", label: "Bengali", hint: "বাংলা" },
  { value: "kn", label: "Kannada", hint: "ಕನ್ನಡ" },
  { value: "ml", label: "Malayalam", hint: "മലയാളം" },
  { value: "gu", label: "Gujarati", hint: "ગુજરાતી" },
  { value: "pa", label: "Punjabi", hint: "ਪੰਜਾਬੀ" },
  { value: "or", label: "Odia", hint: "ଓଡ଼ିଆ" },
]

export const GOALS: readonly Option<Goal>[] = [
  {
    value: "daily_conversation",
    label: "Everyday conversation",
    hint: "Chat with neighbours, friends and shopkeepers",
  },
  { value: "work", label: "Work", hint: "Meetings, updates and calls" },
  { value: "interviews", label: "Interviews", hint: "Answer questions with confidence" },
  { value: "travel", label: "Travel", hint: "Get around and ask for help" },
  { value: "confidence", label: "Speaking confidence", hint: "Feel at ease speaking out loud" },
]

export const LEVELS: readonly Option<Level>[] = [
  { value: "beginner", label: "Beginner", hint: "I know a few words" },
  { value: "elementary", label: "Elementary", hint: "I can say simple sentences" },
  { value: "intermediate", label: "Intermediate", hint: "I can talk, but I make mistakes" },
  { value: "advanced", label: "Advanced", hint: "I speak well and want to polish" },
]
