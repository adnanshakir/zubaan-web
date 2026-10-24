"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { TextMorph } from "torph/react"
import { api, describeError } from "@/lib/api/client"
import type { SttResponse } from "@/lib/api/types"
import { useWavRecorder } from "@/hooks/use-wav-recorder"
import { MicButton } from "@/components/mic-button"
import { PillSelect } from "@/components/pill-select"
import { Card, CardContent } from "@/components/ui/card"

type SttChoice = "unknown" | "en-IN" | "hi-IN" | "ta-IN" | "te-IN"

export default function SttPanel() {
  const [language, setLanguage] = useState<SttChoice>("en-IN")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SttResponse | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  async function transcribe(wav: Blob) {
    setAudioUrl(URL.createObjectURL(wav))
    setBusy(true)
    try {
      setResult(await api.stt(wav, { language }))
    } catch (error) {
      toast.error(describeError(error))
    } finally {
      setBusy(false)
    }
  }

  const recorder = useWavRecorder({
    onRecorded: (wav) => {
      void transcribe(wav)
    },
    onError: (message) => toast.error(message),
  })

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const status =
    recorder.status === "recording"
      ? "Tap to stop"
      : recorder.status === "encoding"
        ? "Processing"
        : busy
          ? "Transcribing"
          : "Tap to speak"

  return (
    <div className="flex flex-col items-center gap-5 text-left">
      <div className="w-full self-stretch">
        <PillSelect
          label="Language"
          options={[
            { value: "unknown", label: "Auto" },
            { value: "en-IN", label: "English" },
            { value: "hi-IN", label: "Hindi" },
            { value: "ta-IN", label: "Tamil" },
            { value: "te-IN", label: "Telugu" },
          ]}
          value={language}
          onChange={setLanguage}
        />
      </div>
      <MicButton
        status={recorder.status}
        disabled={busy}
        onStart={() => void recorder.start()}
        onStop={recorder.stop}
      />
      <p className="text-sm text-muted-foreground" aria-live="polite">
        <TextMorph>{status}</TextMorph>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        Try a sentence with a mistake, like &quot;I goed to market yesterday&quot;. The transcript
        should keep the mistake.
      </p>
      {result ? (
        <Card className="w-full animate-in self-stretch rounded-2xl shadow-none duration-200 fade-in-0 slide-in-from-bottom-1">
          <CardContent className="flex flex-col gap-3 px-5">
            <span className="text-xs text-muted-foreground">Transcript</span>
            <p className={result.text ? "text-base" : "text-base text-muted-foreground"}>
              {result.text || "(nothing heard)"}
            </p>
            <div className="flex flex-wrap gap-2 font-mono text-xs text-muted-foreground">
              <span>{result.totalMs} ms</span>
              {result.durationSeconds !== null ? (
                <span>{result.durationSeconds}s audio</span>
              ) : null}
              {result.languageCode ? <span>{result.languageCode}</span> : null}
            </div>
            {audioUrl ? (
              <>
                <span className="text-xs text-muted-foreground">Your recording</span>
                <audio controls src={audioUrl} className="w-full" />
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
