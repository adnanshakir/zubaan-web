"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import {
  CheckIcon,
  ChevronLeftIcon,
  MicIcon,
  PencilLineIcon,
  SquareIcon,
  Volume2Icon,
} from "lucide-react"
import { TextMorph } from "torph/react"
import { toast } from "sonner"
import { api, audioSrc, describeError } from "@/lib/api/client"
import type {
  ConversationGetResponse,
  ConversationMessage,
  ConversationFeedback,
  LessonDetail,
  RoleplayStep,
} from "@/lib/api/types"
import { useAudioPlayer } from "@/hooks/use-audio-player"
import { useWavRecorder } from "@/hooks/use-wav-recorder"
import FeedbackSummary from "@/components/feedback-summary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChatMessage {
  key: string
  role: "ai" | "user"
  text: string
  audioUrl: string | null
  correction: ConversationMessage["correction"]
  pending: boolean
  fresh: boolean
}

type Phase = "idle" | "transcribing" | "thinking"

interface ConversationViewProps {
  conversation: ConversationGetResponse
  lesson: LessonDetail
  roleplay: RoleplayStep
}

export default function ConversationView({
  conversation,
  lesson,
  roleplay,
}: ConversationViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    conversation.messages.map((message, index) => ({
      key: `m-${index}`,
      role: message.role,
      text: message.text,
      audioUrl: message.audioUrl,
      correction: message.correction,
      pending: false,
      fresh: false,
    })),
  )
  const [phase, setPhase] = useState<Phase>("idle")
  const [ended, setEnded] = useState(conversation.status !== "active")
  const [feedback, setFeedback] = useState<ConversationFeedback | null>(conversation.feedback)
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState("")
  const [ending, setEnding] = useState(false)
  const keyCounter = useRef(conversation.messages.length)
  const bottomRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const player = useAudioPlayer()

  const nextKey = () => {
    const key = `m-${keyCounter.current}`
    keyCounter.current += 1
    return key
  }

  async function sendText(text: string) {
    if (ended) return
    const userKey = nextKey()
    const aiKey = nextKey()
    setMessages((current) => [
      ...current,
      {
        key: userKey,
        role: "user",
        text,
        audioUrl: null,
        correction: null,
        pending: true,
        fresh: true,
      },
    ])
    setPhase("thinking")
    try {
      const turn = await api.takeTurn(conversation.conversationId, text)
      setMessages((current) => [
        ...current.map((message) =>
          message.key === userKey
            ? { ...message, pending: false, correction: turn.correction }
            : message,
        ),
        {
          key: aiKey,
          role: "ai",
          text: turn.reply,
          audioUrl: turn.audioUrl,
          correction: null,
          pending: false,
          fresh: true,
        },
      ])
      const src = audioSrc(turn.audioUrl)
      if (src) void player.play(aiKey, src)
      if (turn.endConversation || turn.turnsRemaining === 0) {
        setEnded(true)
        setFeedback(turn.feedback)
      }
    } catch (error) {
      setMessages((current) => current.filter((message) => message.key !== userKey))
      toast.error(describeError(error))
    } finally {
      setPhase("idle")
    }
  }

  async function handleRecorded(wav: Blob) {
    setPhase("transcribing")
    try {
      const result = await api.stt(wav, { language: "en-IN" })
      const text = result.text.trim().slice(0, 500)
      if (!text) {
        toast.error("We didn't catch that. Try again.")
        setPhase("idle")
        return
      }
      await sendText(text)
    } catch (error) {
      toast.error(describeError(error))
      setPhase("idle")
    }
  }

  async function endNow() {
    setEnding(true)
    player.stop()
    try {
      const result = await api.endConversation(conversation.conversationId)
      setEnded(true)
      setFeedback(result.feedback)
    } catch (error) {
      toast.error(describeError(error))
    } finally {
      setEnding(false)
    }
  }

  const recorder = useWavRecorder({
    onRecorded: (wav) => {
      void handleRecorded(wav)
    },
    onError: (message) => toast.error(message),
  })
  const userCount = messages.filter((message) => message.role === "user").length
  const turnsLeft = Math.max(0, roleplay.maxTurns - userCount)

  useEffect(() => {
    if (ended && summaryRef.current) {
      summaryRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [ended, messages.length])

  function submitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setDraft("")
    void sendText(text)
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col">
      <header className="flex shrink-0 items-center gap-2 px-5 pt-4 pb-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back to lesson">
          <Link href={`/lessons/${conversation.lessonId}`}>
            <ChevronLeftIcon />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-medium">{lesson.title}</p>
          {!ended ? (
            <p className="text-xs text-muted-foreground">
              Turns left <TextMorph>{String(turnsLeft)}</TextMorph>
            </p>
          ) : null}
        </div>
        {!ended ? (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            loading={ending}
            onClick={() => void endNow()}
          >
            End
          </Button>
        ) : (
          <div className="size-8" />
        )}
      </header>
      <p className="shrink-0 px-5 pb-3 text-xs text-muted-foreground">Goal: {roleplay.goal}</p>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <MessageBubble key={message.key} message={message} player={player} />
          ))}
          {ended ? (
            <div ref={summaryRef}>
              {feedback ? (
                <FeedbackSummary feedback={feedback} />
              ) : (
                <p className="text-sm text-muted-foreground">Conversation complete.</p>
              )}
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-3 border-t border-border/60 bg-background px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {ended ? (
          <Button asChild className="w-full">
            <Link href="/lessons">Back to lessons</Link>
          </Button>
        ) : typing ? (
          <>
            <form className="flex w-full gap-2" onSubmit={submitText}>
              <Input
                maxLength={500}
                placeholder="Type your reply"
                aria-label="Your reply"
                className="h-10 rounded-xl"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <Button type="submit" disabled={!draft.trim() || phase !== "idle"}>
                Send
              </Button>
            </form>
            <Button variant="ghost" size="sm" onClick={() => setTyping(false)}>
              Use voice
            </Button>
          </>
        ) : (
          <>
            <div className="relative flex size-16 items-center justify-center">
              {recorder.status === "recording" ? (
                <span
                  aria-hidden
                  className="animate-pulse-ring absolute inset-0 rounded-full bg-primary"
                />
              ) : null}
              <Button
                size="icon"
                variant={recorder.status === "recording" ? "destructive" : "indigo"}
                className="size-16"
                aria-label={recorder.status === "recording" ? "Stop recording" : "Start recording"}
                loading={recorder.status === "encoding"}
                disabled={phase !== "idle" || recorder.status === "encoding"}
                onClick={() => {
                  if (recorder.status === "recording") {
                    recorder.stop()
                  } else {
                    player.stop()
                    void recorder.start()
                  }
                }}
              >
                {recorder.status === "recording" ? (
                  <SquareIcon className="size-5" />
                ) : recorder.status === "idle" ? (
                  <MicIcon className="size-6" />
                ) : null}
              </Button>
            </div>
            <p aria-live="polite" className="text-sm text-muted-foreground">
              <TextMorph>
                {recorder.status === "recording"
                  ? "Tap to stop"
                  : recorder.status === "encoding"
                    ? "Processing"
                    : phase === "transcribing"
                      ? "Transcribing"
                      : phase === "thinking"
                        ? "Thinking"
                        : "Tap to speak"}
              </TextMorph>
            </p>
            <Button
              variant="ghost"
              size="sm"
              disabled={phase !== "idle" || recorder.status === "recording"}
              onClick={() => setTyping(true)}
            >
              Type instead
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  player,
}: {
  message: ChatMessage
  player: ReturnType<typeof useAudioPlayer>
}) {
  const isPlaying = player.activeId === message.key
  const src = audioSrc(message.audioUrl)
  const noteClass = message.fresh ? "animate-in fade-in-0 slide-in-from-bottom-1 duration-200" : ""

  return (
    <div className={`flex flex-col gap-2 ${message.role === "user" ? "items-end" : "items-start"}`}>
      <div
        className={
          message.role === "ai"
            ? "max-w-[85%] rounded-2xl border border-border bg-card px-4 py-3"
            : `max-w-[85%] rounded-2xl border border-primary/30 bg-primary/20 px-4 py-3 ${
                message.pending ? "opacity-70" : ""
              }`
        }
      >
        <p className="text-base">{message.text}</p>
        {message.role === "ai" && src ? (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={isPlaying ? "Stop reply" : "Play reply"}
            onClick={() => {
              if (isPlaying) player.stop()
              else void player.play(message.key, src)
            }}
          >
            {isPlaying ? <SquareIcon /> : <Volume2Icon />}
          </Button>
        ) : null}
      </div>
      {message.role === "user" && !message.pending ? (
        message.correction ? (
          <div
            className={`flex max-w-[85%] gap-2 rounded-xl bg-amber-400/10 px-3 py-2 ${noteClass}`}
          >
            <PencilLineIcon className="size-4 shrink-0 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Say it like this</span>
              <span className="text-sm font-medium">{message.correction.corrected}</span>
              <span className="text-xs text-muted-foreground">
                {message.correction.explanation}
              </span>
            </div>
          </div>
        ) : (
          <p className={`flex items-center gap-1 text-xs text-emerald-400 ${noteClass}`}>
            <CheckIcon className="size-3.5" />
            Sounds good
          </p>
        )
      ) : null}
    </div>
  )
}
