"use client"

import { useState } from "react"
import { LightbulbIcon, PlayIcon, SquareIcon } from "lucide-react"
import { usePhrasePlayer } from "@/hooks/use-phrase-player"
import { haptic } from "@/lib/haptics"
import { Button } from "@/components/ui/button"

interface HintPanelProps {
  hint: { en: string; hi: string }
  sentence: string
  revealed: boolean
  turnKey: string
}

export function HintPanel({ hint, sentence, revealed, turnKey }: HintPanelProps) {
  const [expanded, setExpanded] = useState(revealed)
  const player = usePhrasePlayer()
  const playing = player.active?.id === "conversation-hint"

  function showSentence() {
    haptic.select()
    setExpanded(true)
  }

  return (
    <div
      data-turn-key={turnKey}
      className="flex max-w-[85%] animate-in flex-col gap-3 self-end rounded-2xl border border-indigo-400/30 bg-indigo-400/10 p-3 text-sm duration-200 fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-amber-400">
          <LightbulbIcon className="size-4" />
          <span>Say this</span>
        </div>
        <p className="font-medium">{hint.en}</p>
        <p className="text-muted-foreground" lang="hi">
          {hint.hi}
        </p>
      </div>
      {expanded ? (
        <>
          <p className="text-base font-semibold">{sentence}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={playing ? "Stop sentence" : "Listen to sentence"}
              loading={
                player.active?.id === "conversation-hint" && player.active.status === "loading"
              }
              onClick={() =>
                playing ? player.stop() : void player.play("conversation-hint", sentence)
              }
            >
              {playing ? <SquareIcon /> : <PlayIcon />}
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Listen to sentence slowly"
              onClick={() => void player.play("conversation-hint", sentence, 0.7)}
            >
              <PlayIcon />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
              Hide
            </Button>
          </div>
        </>
      ) : (
        <Button variant="outline" size="sm" className="self-start" onClick={showSentence}>
          Show sentence
        </Button>
      )}
    </div>
  )
}
