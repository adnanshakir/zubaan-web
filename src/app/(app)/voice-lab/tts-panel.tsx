"use client"

import { useRef, useState } from "react"
import { PlayIcon, SquareIcon } from "lucide-react"
import { TextMorph } from "torph/react"
import { api, audioSrc, describeError } from "@/lib/api/client"
import { notifyError } from "@/lib/notify"
import type { TtsLanguage, TtsProviderName } from "@/lib/api/types"
import { useAudioPlayer } from "@/hooks/use-audio-player"
import { PillSelect } from "@/components/pill-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

type Pace = "default" | "0.8" | "1" | "1.2"
type Entry = {
  id: string
  text: string
  provider: string
  language: string
  voice: string | null
  pace: number | null
  totalMs: number
  cached: boolean
  audioUrl: string
}

export default function TtsPanel() {
  const [text, setText] = useState("Hello! Welcome to your English lesson. How are you today?")
  const [provider, setProvider] = useState<TtsProviderName>("kokoro")
  const [language, setLanguage] = useState<TtsLanguage>("en-IN")
  const [voice, setVoice] = useState("")
  const [pace, setPace] = useState<Pace>("default")
  const [generating, setGenerating] = useState(false)
  const [history, setHistory] = useState<Entry[]>([])
  const player = useAudioPlayer()
  const counter = useRef(0)

  async function generate() {
    setGenerating(true)
    try {
      const result = await api.tts({
        text: text.trim(),
        language,
        provider,
        ...(voice.trim() ? { voice: voice.trim() } : {}),
        ...(provider === "sarvam" && pace !== "default" ? { pace: Number(pace) } : {}),
      })
      const entry: Entry = {
        id: `tts-${counter.current++}`,
        text: text.trim(),
        provider: result.provider,
        language,
        voice: result.voice || null,
        pace: result.pace,
        totalMs: result.totalMs,
        cached: result.cached,
        audioUrl: result.audioUrl,
      }
      setHistory((previous) => [entry, ...previous].slice(0, 6))
      const src = audioSrc(result.audioUrl)
      if (src) void player.play(entry.id, src)
    } catch (error) {
      notifyError(describeError(error))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Textarea
        maxLength={500}
        rows={3}
        className="rounded-2xl"
        aria-label="Text to speak"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <PillSelect
        label="Provider"
        options={[
          { value: "kokoro", label: "Kokoro" },
          { value: "sarvam", label: "Sarvam" },
        ]}
        value={provider}
        onChange={(value) => {
          setProvider(value)
          if (value === "kokoro") setLanguage("en-IN")
        }}
      />
      <PillSelect
        label="Language"
        options={[
          { value: "en-IN", label: "English" },
          { value: "hi-IN", label: "Hindi", disabled: provider === "kokoro" },
          { value: "ta-IN", label: "Tamil", disabled: provider === "kokoro" },
          { value: "te-IN", label: "Telugu", disabled: provider === "kokoro" },
        ]}
        value={language}
        onChange={setLanguage}
      />
      <Input
        aria-label="Voice"
        placeholder="Default voice"
        className="h-10 rounded-xl"
        value={voice}
        onChange={(event) => setVoice(event.target.value)}
      />
      {provider === "sarvam" ? (
        <PillSelect
          label="Pace"
          options={[
            { value: "default", label: "Default" },
            { value: "0.8", label: "0.8×" },
            { value: "1", label: "1×" },
            { value: "1.2", label: "1.2×" },
          ]}
          value={pace}
          onChange={setPace}
        />
      ) : null}
      <p className="text-xs text-muted-foreground">
        {provider === "sarvam"
          ? "Sarvam uses paid credits. Identical requests are cached."
          : "Kokoro is free but the first request after a pause can take about 10 seconds."}
      </p>
      <Button
        variant="indigo"
        className="w-full"
        loading={generating}
        disabled={!text.trim() || generating}
        onClick={generate}
      >
        <TextMorph>{generating ? "Generating" : "Generate and play"}</TextMorph>
      </Button>
      {history.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Recent</h2>
          <div className="flex flex-col gap-2">
            {history.map((entry, index) => {
              const active = player.activeId === entry.id
              return (
                <Card
                  key={entry.id}
                  className="flex flex-row items-center gap-3 rounded-2xl px-4 py-3 shadow-none"
                >
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Play result"
                    onClick={() =>
                      active
                        ? player.stop()
                        : void player.play(entry.id, audioSrc(entry.audioUrl) ?? "")
                    }
                  >
                    {active ? <SquareIcon /> : <PlayIcon />}
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {entry.provider} · {entry.language}
                      {entry.voice ? ` · ${entry.voice}` : ""}
                      {entry.pace ? ` · ${entry.pace}×` : ""}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{entry.text}</p>
                  </div>
                  {entry.cached ? (
                    <Badge variant="outline" className="border-emerald-400/30 text-emerald-400">
                      cached
                    </Badge>
                  ) : (
                    <span className="font-mono text-xs">
                      {index === 0 ? (
                        <TextMorph>{`${entry.totalMs} ms`}</TextMorph>
                      ) : (
                        `${entry.totalMs} ms`
                      )}
                    </span>
                  )}
                </Card>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
