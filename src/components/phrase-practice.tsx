"use client"

import { useRef, useState } from "react"
import { MicIcon, PlayIcon, SquareIcon } from "lucide-react"
import { api, describeError } from "@/lib/api/client"
import type { MatchResult } from "@/lib/speech-match"
import { matchSpeech } from "@/lib/speech-match"
import { haptic } from "@/lib/haptics"
import { notifyError } from "@/lib/notify"
import { isNonLatin } from "@/lib/text"
import type { usePhrasePlayer } from "@/hooks/use-phrase-player"
import { useWavRecorder } from "@/hooks/use-wav-recorder"
import { Button } from "@/components/ui/button"
import { ColoredSentence } from "@/components/colored-sentence"
import { SpeechLegend } from "@/components/speech-legend"
import { VerdictBadge } from "@/components/verdict-badge"

interface PhrasePracticeProps {
  phrases: ReadonlyArray<{ id: string; text: string }>
  player: ReturnType<typeof usePhrasePlayer>
}

interface PracticeResult {
  match: MatchResult
  heard: string
}

export function PhrasePractice({ phrases, player }: PhrasePracticeProps) {
  const targetRef = useRef<string | null>(null)
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, PracticeResult>>({})

  async function check(wav: Blob) {
    const id = targetRef.current
    const phrase = phrases.find((item) => item.id === id)
    if (!id || !phrase) return
    setBusyId(id)
    try {
      const result = await api.stt(wav, { language: "en-IN" })
      if (isNonLatin(result.text)) {
        notifyError("We couldn't read that as English. Try again, a little slower.")
        return
      }
      const match = matchSpeech(phrase.text, result.text)
      setResults((previous) => ({
        ...previous,
        [id]: { match, heard: result.text.trim() },
      }))
      if (match.verdict === "said") haptic.success()
      else if (match.verdict === "close") haptic.nudge()
      else haptic.error()
    } catch (error) {
      notifyError(describeError(error))
    } finally {
      setBusyId(null)
      setRecordingId(null)
      targetRef.current = null
    }
  }

  const recorder = useWavRecorder({
    onRecorded: (wav) => {
      void check(wav)
    },
    onError: (message) => {
      notifyError(message)
      setBusyId(null)
      setRecordingId(null)
      targetRef.current = null
    },
  })

  function toggleRecording(id: string) {
    if (recorder.status === "recording") {
      haptic.nudge()
      recorder.stop()
      return
    }
    player.stop()
    targetRef.current = id
    setRecordingId(id)
    haptic.nudge()
    void recorder.start()
  }

  return (
    <div className="flex flex-col gap-4">
      {phrases.map((phrase) => {
        const result = results[phrase.id]
        const playing = player.active?.id === phrase.id
        const recording = recordingId === phrase.id && recorder.status === "recording"
        const busy = busyId === phrase.id
        return (
          <div key={phrase.id} className="flex items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              aria-label={`${playing ? "Stop" : "Play"}: ${phrase.text}`}
              loading={player.active?.id === phrase.id && player.active.status === "loading"}
              onClick={() => (playing ? player.stop() : void player.play(phrase.id, phrase.text))}
            >
              {playing ? <SquareIcon /> : <PlayIcon />}
            </Button>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {result ? (
                <>
                  <ColoredSentence words={result.match.words} />
                  <div className="flex flex-wrap items-center gap-2">
                    <VerdictBadge verdict={result.match.verdict} />
                    <span className="text-xs text-muted-foreground">
                      Heard: &quot;{result.heard || "nothing"}&quot;
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-base font-medium">{phrase.text}</span>
              )}
            </div>
            <Button
              variant={recording ? "indigo" : "outline"}
              size="icon"
              aria-label={recording ? "Stop recording" : "Record this sentence"}
              loading={busy || (recorder.status === "encoding" && recordingId === phrase.id)}
              disabled={
                (recordingId !== null && recordingId !== phrase.id) ||
                (busyId !== null && busyId !== phrase.id)
              }
              onClick={() => toggleRecording(phrase.id)}
            >
              {recording ? <SquareIcon /> : <MicIcon />}
            </Button>
          </div>
        )
      })}
      <p className="text-xs text-muted-foreground">
        Tap the mic, say the sentence, then see how it went.
      </p>
      <SpeechLegend />
    </div>
  )
}
