"use client"

import { useEffect, useRef, useState } from "react"
import { EyeIcon, MicIcon, PlayIcon, SquareIcon } from "lucide-react"
import type { ReplySpeakExercise } from "@/lib/api/types"
import type { MatchResult, Verdict } from "@/lib/speech-match"
import { matchSpeech } from "@/lib/speech-match"
import { api, describeError } from "@/lib/api/client"
import { haptic } from "@/lib/haptics"
import { notifyError } from "@/lib/notify"
import { isNonLatin } from "@/lib/text"
import { usePhrasePlayer } from "@/hooks/use-phrase-player"
import { useWavRecorder } from "@/hooks/use-wav-recorder"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ColoredSentence } from "@/components/colored-sentence"
import { SpeechLegend } from "@/components/speech-legend"
import { VerdictBadge } from "@/components/verdict-badge"

interface ReplySpeakExerciseProps {
  exercise: ReplySpeakExercise
  onResult: (correct: boolean, label?: string, verdict?: Verdict) => void
  onSkip?: () => void
}

interface SpeechResult {
  match: MatchResult
  heard: string
}

export function ReplySpeakExercise({ exercise, onResult, onSkip }: ReplySpeakExerciseProps) {
  const player = usePhrasePlayer()
  const playedOnce = useRef(false)
  const checkToken = useRef(0)
  const mounted = useRef(true)
  const [showReply, setShowReply] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SpeechResult | null>(null)
  const { play, stop } = player
  const playing = player.active?.id === exercise.id

  useEffect(() => {
    return () => {
      mounted.current = false
      checkToken.current += 1
    }
  }, [])

  useEffect(() => {
    if (!playedOnce.current) {
      playedOnce.current = true
      void play(exercise.id, exercise.ai)
    }
    return stop
  }, [exercise.id, exercise.ai, play, stop])

  async function check(wav: Blob) {
    const token = ++checkToken.current
    setBusy(true)
    try {
      const sttResult = await api.stt(wav, { language: "en-IN" })
      if (!mounted.current || token !== checkToken.current) return
      if (isNonLatin(sttResult.text)) {
        notifyError("We couldn't read that as English. Try again, a little slower.")
        return
      }

      let bestMatch: MatchResult | null = null
      for (const accept of exercise.accept) {
        const m = matchSpeech(accept, sttResult.text)
        if (!bestMatch || m.score > bestMatch.score) {
          bestMatch = m
        }
      }

      if (!bestMatch) return

      setResult({ match: bestMatch, heard: sttResult.text.trim() })

      const verdict = bestMatch.verdict
      if (!mounted.current || token !== checkToken.current) return
      if (verdict === "said") haptic.success()
      else if (verdict === "close") haptic.nudge()
      else haptic.error()

      onResult(verdict !== "missed", undefined, verdict)
    } catch (error) {
      if (!mounted.current || token !== checkToken.current) return
      notifyError(describeError(error))
    } finally {
      if (mounted.current && token === checkToken.current) setBusy(false)
    }
  }

  const recorder = useWavRecorder({
    onRecorded: (wav) => {
      void check(wav)
    },
    onError: (message) => {
      notifyError(message)
      setBusy(false)
    },
  })

  function toggleRecording() {
    if (recorder.status === "recording") {
      haptic.nudge()
      recorder.stop()
      return
    }
    player.stop()
    haptic.nudge()
    void recorder.start()
  }

  const recording = recorder.status === "recording"
  const unavailable = recording || recorder.status === "encoding" || busy

  return (
    <div className="flex flex-col gap-5" data-exercise-id={exercise.id}>
      {/* AI chat bubble */}
      <div className="flex gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-base">{exercise.ai}</p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label={playing ? "Stop listening" : "Listen"}
              loading={player.active?.id === exercise.id && player.active.status === "loading"}
              onClick={() => (playing ? player.stop() : void player.play(exercise.id, exercise.ai))}
            >
              {playing ? <SquareIcon /> : <PlayIcon />}
            </Button>
          </div>
        </div>
      </div>

      {/* Hint card */}
      <Card className="rounded-2xl p-4 shadow-none">
        <p className="text-sm text-muted-foreground">{exercise.hint.en}</p>
        <p className="mt-1 text-sm text-muted-foreground" lang="hi">
          {exercise.hint.hi}
        </p>
        {!showReply ? (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowReply(true)}>
            <EyeIcon className="mr-1.5 size-4" />
            Show a possible reply
          </Button>
        ) : (
          <p className="mt-2 text-base font-medium text-indigo-400">{exercise.accept[0]}</p>
        )}
      </Card>

      {/* Recording / result */}
      {result ? (
        <div className="flex flex-col gap-2">
          <ColoredSentence words={result.match.words} />
          <div className="flex flex-wrap items-center gap-2">
            <VerdictBadge verdict={result.match.verdict} />
            <span className="text-xs text-muted-foreground">
              Heard: &quot;{result.heard || "nothing"}&quot;
            </span>
          </div>
          <SpeechLegend />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            variant={recording ? "indigo" : "outline"}
            size="icon"
            aria-label={recording ? "Stop recording" : "Record your reply"}
            loading={unavailable}
            onClick={toggleRecording}
          >
            {recording ? <SquareIcon /> : <MicIcon />}
          </Button>
          <span className="text-sm text-muted-foreground">Say your reply</span>
        </div>
      )}

      {/* Skip button */}
      {!result ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={unavailable}
          onClick={() => {
            checkToken.current += 1
            onSkip?.()
            onResult(true)
          }}
        >
          Skip
        </Button>
      ) : null}
    </div>
  )
}
