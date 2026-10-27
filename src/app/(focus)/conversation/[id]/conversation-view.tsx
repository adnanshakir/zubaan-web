"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import {
  CheckIcon,
  CircleDotIcon,
  ChevronLeftIcon,
  XIcon,
  MicIcon,
  PencilLineIcon,
  SquareIcon,
  Volume2Icon,
} from "lucide-react"
import { TextMorph } from "torph/react"
import { api, audioSrc, describeError } from "@/lib/api/client"
import { haptic } from "@/lib/haptics"
import { notifyError } from "@/lib/notify"
import { isNonLatin } from "@/lib/text"
import type {
  ConversationGetResponse,
  ConversationMessage,
  ChatTurn,
  LessonDetail,
} from "@/lib/api/types"
import { turnSentence } from "@/lib/lesson-helpers"
import { useAudioPlayer } from "@/hooks/use-audio-player"
import { useWavRecorder } from "@/hooks/use-wav-recorder"
import { HintPanel } from "@/components/hint-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChatMessage {
  key: string
  role: "ai" | "user"
  text: string
  audioUrl: string | null
  correction: ConversationMessage["correction"]
  turnIndex: number
  outcome: ConversationMessage["outcome"]
  revealHint: boolean
  pending: boolean
  fresh: boolean
}

type Phase = "idle" | "transcribing" | "thinking"

interface ConversationViewProps {
  conversation: ConversationGetResponse
  lesson: LessonDetail
}

export default function ConversationView({ conversation, lesson }: ConversationViewProps) {
  const chat = lesson.chat
  const initialMessages = conversation.messages.map((message, index) => ({
    key: `m-${index}`,
    role: message.role,
    text: message.text,
    audioUrl: message.audioUrl,
    correction: message.correction,
    turnIndex: message.turnIndex,
    outcome: message.outcome,
    revealHint: message.revealHint ?? false,
    pending: false,
    fresh: false,
  }))
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [opening] = useState(() => {
    const first = initialMessages[0]
    const src = first?.audioUrl ? audioSrc(first.audioUrl) : null
    return conversation.status === "active" &&
      initialMessages.length === 1 &&
      first?.role === "ai" &&
      src
      ? { key: first.key, src }
      : null
  })
  const [phase, setPhase] = useState<Phase>("idle")
  const [ended, setEnded] = useState(conversation.status !== "active")
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState("")
  const [ending, setEnding] = useState(false)
  const [progress, setProgress] = useState(() => {
    const lastTurn = [...conversation.messages].reverse().find((message) => message.turnIndex >= 0)
    return {
      current: lastTurn ? lastTurn.turnIndex + 1 : 0,
      total: chat.turns.length,
    }
  })
  const keyCounter = useRef(conversation.messages.length)
  const bottomRef = useRef<HTMLDivElement>(null)
  const player = useAudioPlayer()
  const { play } = player

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
        turnIndex: Math.max(0, progress.current - 1),
        outcome: undefined,
        revealHint: false,
        pending: true,
        fresh: true,
      },
    ])
    setPhase("thinking")
    try {
      const turn = await api.takeTurn(conversation.conversationId, text)
      const nextProgress = {
        current: Math.min(progress.current + 1, progress.total),
        total: progress.total,
      }
      setMessages((current) => [
        ...current.map((message) =>
          message.key === userKey
            ? {
                ...message,
                pending: false,
                correction: turn.correction,
                outcome: undefined,
              }
            : message,
        ),
        {
          key: aiKey,
          role: "ai",
          text: turn.reply,
          audioUrl: turn.audioUrl,
          correction: null,
          turnIndex: Math.max(0, nextProgress.current - 1),
          outcome: undefined,
          revealHint: false,
          pending: false,
          fresh: true,
        },
      ])
      const src = audioSrc(turn.audioUrl)
      if (src) void player.play(aiKey, src)
      setProgress(nextProgress)
      if (turn.correction) {
        haptic.nudge()
      } else {
        haptic.success()
      }
      if (turn.endConversation || turn.turnsRemaining === 0) {
        setEnded(true)
        haptic.success()
      }
    } catch (error) {
      setMessages((current) => current.filter((message) => message.key !== userKey))
      notifyError(describeError(error))
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
        notifyError("We didn't catch that. Try again.")
        setPhase("idle")
        return
      }
      if (isNonLatin(text)) {
        notifyError("We couldn't read that as English. Try again, a little slower.")
        setPhase("idle")
        return
      }
      await sendText(text)
    } catch (error) {
      notifyError(describeError(error))
      setPhase("idle")
    }
  }

  async function endNow() {
    setEnding(true)
    try {
      await api.endConversation(conversation.conversationId)
      setEnded(true)
      haptic.success()
    } catch (error) {
      notifyError(describeError(error))
    } finally {
      setEnding(false)
    }
  }

  const recorder = useWavRecorder({
    onRecorded: (wav) => {
      void handleRecorded(wav)
    },
    onError: (message) => notifyError(message),
  })
  const userCount = messages.filter((message) => message.role === "user").length
  const turnsLeft = Math.max(0, chat.turns.length - userCount)
  const latestAiMessage = messages.findLast((message) => message.role === "ai")
  const hintIndex = Math.min(
    Math.max(progress.current > 0 ? progress.current - 1 : (latestAiMessage?.turnIndex ?? 0), 0),
    Math.max(chat.turns.length - 1, 0),
  )
  const hintTurn = chat.turns[hintIndex]
  const hintTurnKey = `${hintIndex}-${latestAiMessage?.key ?? "initial"}`

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [ended, messages.length])

  useEffect(() => {
    if (opening) void play(opening.key, opening.src)
  }, [opening, play])

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
      <p className="shrink-0 px-5 pb-3 text-xs text-muted-foreground">Goal: {chat.goal}</p>
      {chat.turns.length ? (
        <div className="flex items-center gap-3 px-5 pb-3 text-xs text-muted-foreground">
          <span>
            Turn {Math.min(progress.current, progress.total)} of {progress.total}
          </span>
          <div
            className="flex items-center gap-1.5"
            aria-label={`Turn ${progress.current} of ${progress.total}`}
          >
            {chat.turns.map((turn, index) => (
              <span
                key={`${turn.sentenceId}-${index}`}
                className={`size-1.5 rounded-full ${
                  index < progress.current
                    ? "bg-indigo-400"
                    : index === progress.current
                      ? "bg-foreground"
                      : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8">
        <div className="flex flex-col gap-3">
          {messages.map((message, index) => {
            const nextUser = messages
              .slice(index + 1)
              .find((item) => item.role === "user" && item.turnIndex === message.turnIndex)
            const laterAiForTurn = messages
              .slice(index + 1)
              .some((item) => item.role === "ai" && item.turnIndex === message.turnIndex)
            const turn =
              message.role === "ai" && chat.turns[message.turnIndex]
                ? {
                    ...chat.turns[message.turnIndex],
                    expect: turnSentence(lesson, message.turnIndex),
                  }
                : undefined
            return (
              <MessageBubble
                key={message.key}
                message={message}
                player={player}
                turn={turn}
                targetOutcome={
                  !laterAiForTurn && nextUser?.outcome !== undefined ? nextUser.outcome : undefined
                }
              />
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-3 border-t border-border/60 bg-background px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {!ended && hintTurn ? (
          <HintPanel
            key={hintTurnKey}
            hint={hintTurn.hint}
            sentence={turnSentence(lesson, hintIndex)}
            revealed={latestAiMessage?.revealHint ?? false}
            turnKey={hintTurnKey}
          />
        ) : null}
        {ended ? (
          <>
            <Button asChild variant="indigo" className="w-full">
              <Link href={`/conversation/${conversation.conversationId}/summary`}>See summary</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/lessons">Back to lessons</Link>
            </Button>
          </>
        ) : typing ? (
          <>
            <form className="flex w-full gap-2" onSubmit={submitText}>
              <Input
                maxLength={500}
                placeholder="Type your answer"
                aria-label="Your reply"
                className="h-10 rounded-xl"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <Button variant="indigo" type="submit" disabled={!draft.trim() || phase !== "idle"}>
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
                  haptic.nudge()
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
  turn,
  targetOutcome,
}: {
  message: ChatMessage
  player: ReturnType<typeof useAudioPlayer>
  turn?: ChatTurn & { expect: string }
  targetOutcome?: ConversationMessage["outcome"]
}) {
  const isPlaying = player.activeId === message.key
  const src = audioSrc(message.audioUrl)
  const noteClass = message.fresh ? "animate-in fade-in-0 slide-in-from-bottom-1 duration-200" : ""

  return (
    <div className={`flex flex-col gap-2 ${message.role === "user" ? "items-end" : "items-start"}`}>
      {message.role === "ai" ? (
        <div className="flex max-w-[92%] items-end gap-2 self-start">
          <div className="min-w-0 rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-base">{message.text}</p>
          </div>
          {src ? (
            <Button
              variant="outline"
              size="icon-sm"
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
      ) : (
        <div
          className={`max-w-[85%] rounded-2xl border border-primary/30 bg-primary/20 px-4 py-3 ${
            message.pending ? "opacity-70" : ""
          }`}
        >
          <p className="text-base">{message.text}</p>
        </div>
      )}
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
      {message.role === "ai" && turn && targetOutcome ? (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {targetOutcome === "exact" ? (
            <CheckIcon className="size-3.5 text-emerald-400" />
          ) : targetOutcome === "close" ? (
            <CircleDotIcon className="size-3.5 text-amber-400" />
          ) : targetOutcome === "moved_on" || targetOutcome === "off" ? (
            <XIcon className="size-3.5 text-rose-400" />
          ) : null}
          <span>Target: {turn.expect}</span>
        </p>
      ) : null}
    </div>
  )
}
