"use client"

import { LightbulbIcon, PlayIcon, SquareIcon } from "lucide-react"
import { useState } from "react"
import { usePhrasePlayer } from "@/hooks/use-phrase-player"
import { haptic } from "@/lib/haptics"
import { Button } from "@/components/ui/button"

interface TurnHintProps {
  turn: {
    expect: string
    hint: { en: string; hi: string }
  }
  revealed: boolean
}

export function TurnHint({ turn, revealed }: TurnHintProps) {
  const [open, setOpen] = useState(revealed)
  const [sentenceShown, setSentenceShown] = useState(revealed)
  const player = usePhrasePlayer()
  const playing = player.active?.id === "turn-hint"

  function openHint() {
    setOpen(true)
    haptic.select()
  }

  return open ? (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm">{turn.hint.en}</p>
        <p className="text-sm text-muted-foreground" lang="hi">
          {turn.hint.hi}
        </p>
      </div>
      {sentenceShown ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{turn.expect}</p>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={playing ? "Stop sentence" : "Listen to sentence"}
              loading={player.active?.id === "turn-hint" && player.active.status === "loading"}
              onClick={() => (playing ? player.stop() : void player.play("turn-hint", turn.expect))}
            >
              {playing ? <SquareIcon /> : <PlayIcon />}
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Listen to sentence slowly"
              onClick={() => void player.play("turn-hint", turn.expect, 0.7)}
            >
              <PlayIcon />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setSentenceShown(true)}
        >
          Show sentence
        </Button>
      )}
    </div>
  ) : (
    <Button variant="ghost" size="sm" className="self-start" onClick={openHint}>
      <LightbulbIcon />
      Hint
    </Button>
  )
}
