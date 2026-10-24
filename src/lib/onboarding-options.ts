import type { Goal, Language, Level } from "@/lib/api/types"
import type { Option } from "@/components/option-list"
import {
  BriefcaseIcon,
  HandshakeIcon,
  MessagesSquareIcon,
  MicIcon,
  PlaneIcon,
  SignalHighIcon,
  SignalIcon,
  SignalLowIcon,
  SignalMediumIcon,
} from "lucide-react"

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
    icon: MessagesSquareIcon,
  },
  { value: "work", label: "Work", hint: "Meetings, updates and calls", icon: BriefcaseIcon },
  {
    value: "interviews",
    label: "Interviews",
    hint: "Answer questions with confidence",
    icon: HandshakeIcon,
  },
  { value: "travel", label: "Travel", hint: "Get around and ask for help", icon: PlaneIcon },
  {
    value: "confidence",
    label: "Speaking confidence",
    hint: "Feel at ease speaking out loud",
    icon: MicIcon,
  },
]

export const LEVELS: readonly Option<Level>[] = [
  { value: "beginner", label: "Beginner", hint: "I know a few words", icon: SignalLowIcon },
  {
    value: "elementary",
    label: "Elementary",
    hint: "I can say simple sentences",
    icon: SignalMediumIcon,
  },
  {
    value: "intermediate",
    label: "Intermediate",
    hint: "I can talk, but I make mistakes",
    icon: SignalHighIcon,
  },
  {
    value: "advanced",
    label: "Advanced",
    hint: "I speak well and want to polish",
    icon: SignalIcon,
  },
]
