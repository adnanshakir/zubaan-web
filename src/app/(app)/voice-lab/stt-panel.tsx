"use client"

import { useEffect, useState } from "react"
import { TextMorph } from "torph/react"
import { api, describeError } from "@/lib/api/client"
import { notifyError } from "@/lib/notify"
import type { SttMode, SttResponse } from "@/lib/api/types"
import { useWavRecorder } from "@/hooks/use-wav-recorder"
import { MicButton } from "@/components/mic-button"
import { PillSelect } from "@/components/pill-select"
import { Card, CardContent } from "@/components/ui/card"

type SttChoice = "unknown" | "en-IN" | "hi-IN" | "ta-IN" | "te-IN"
type ModeChoice = "default" | SttMode

export default function SttPanel() {
  const [language, setLanguage] = useState<SttChoice>("en-IN")
  const [mode, setMode] = useState<ModeChoice>("default")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SttResponse | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  async function transcribe(wav: Blob) {
    setAudioUrl(URL.createObjectURL(wav))
    setResult(null)
    setBusy(true)
    try {
      setResult(await api.stt(wav, { language, mode: mode === "default" ? undefined : mode }))
    } catch (error) {
      notifyError(describeError(error))
    } finally {
      setBusy(false)
    }
  }

  const recorder = useWavRecorder({
    onRecorded: (wav) => {
      void transcribe(wav)
    },
    onError: (message) => notifyError(message),
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
        <div className="mt-3">
          <PillSelect
            label="Mode"
            options={[
              { value: "default", label: "Default" },
              { value: "codemix", label: "Codemix" },
              { value: "verbatim", label: "Verbatim" },
              { value: "transcribe", label: "Transcribe" },
              { value: "translit", label: "Translit" },
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Default is chosen by the server. Say the same sentence in each mode: in some modes English
          speech comes back in Hindi script.
        </p>
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
              <span>{result.mode}</span>
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
