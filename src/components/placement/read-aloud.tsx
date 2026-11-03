"use client"

import { useState } from "react"
import { CheckIcon, MicIcon, SquareIcon } from "lucide-react"
import { api, describeError } from "@/lib/api/client"
import { haptic } from "@/lib/haptics"
import { notifyError } from "@/lib/notify"
import { isNonLatin } from "@/lib/text"
import { matchSpeech } from "@/lib/speech-match"
import { useWavRecorder } from "@/hooks/use-wav-recorder"
import { Button } from "@/components/ui/button"
import type { PlacementItem } from "@/lib/api/types"

interface ReadAloudProps {
  item: PlacementItem
  onResult: (result: { passed: boolean; skipped?: boolean }) => void
}

export function ReadAloud({ item, onResult }: ReadAloudProps) {
  const [recorded, setRecorded] = useState(false)
  async function check(wav: Blob) {
    try {
      const result = await api.stt(wav, { language: "en-IN" })
      if (isNonLatin(result.text)) {
        notifyError("We couldn't read that as English. Try again, a little slower.")
        return
      }
      setRecorded(true)
      onResult({ passed: matchSpeech(item.text, result.text).verdict !== "missed" })
    } catch (error) {
      notifyError(describeError(error))
    }
  }

  const recorder = useWavRecorder({
    onRecorded: (wav) => {
      void check(wav)
    },
    onError: notifyError,
  })

  function toggleRecording() {
    if (recorder.status === "recording") {
      haptic.nudge()
      recorder.stop()
      return
    }
    setRecorded(false)
    haptic.nudge()
    void recorder.start()
  }

  const recording = recorder.status === "recording"
  const busy = recorder.status === "encoding"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xl font-semibold">{item.text}</p>
        {item.native ? <p className="mt-2 text-sm text-muted-foreground">{item.native}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant={recording ? "indigo" : "outline"}
          size="icon"
          aria-label={recording ? "Stop recording" : "Record this sentence"}
          loading={busy}
          onClick={toggleRecording}
        >
          {recording ? <SquareIcon /> : <MicIcon />}
        </Button>
        {recorded ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckIcon className="text-muted-foreground" />
            Recorded
          </span>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => onResult({ passed: false, skipped: true })}
      >
        Skip this one
      </Button>
    </div>
  )
}
