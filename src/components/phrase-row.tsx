"use client"

import { LightbulbIcon, PlayIcon, SquareIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { usePhrasePlayer } from "@/hooks/use-phrase-player"

interface PhraseRowProps {
  id: string
  text: string
  hint?: string
  tip?: string | null
  hintLang?: string
  player: ReturnType<typeof usePhrasePlayer>
}

export function PhraseRow({ id, text, hint, tip, hintLang, player }: PhraseRowProps) {
  const status = player.active?.id === id ? player.active.status : null
  const isPlaying = status === "playing"

  return (
    <div className="flex items-start gap-3">
      <Button
        variant="outline"
        size="icon"
        aria-label={`${isPlaying ? "Stop" : "Play"}: ${text}`}
        loading={status === "loading"}
        onClick={() => (isPlaying ? player.stop() : void player.play(id, text))}
      >
        {status === "loading" ? null : isPlaying ? <SquareIcon /> : <PlayIcon />}
      </Button>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-base font-medium">{text}</span>
        {hint ? (
          <span className="text-sm text-muted-foreground" lang={hintLang}>
            {hint}
          </span>
        ) : null}
        {tip ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <LightbulbIcon className="size-3.5" />
            {tip}
          </span>
        ) : null}
      </div>
    </div>
  )
}
