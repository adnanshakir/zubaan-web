"use client"

import { LightbulbIcon, PlayIcon, SquareIcon } from "lucide-react"
import { useState } from "react"
import { haptic } from "@/lib/haptics"
import { usePhrasePlayer } from "@/hooks/use-phrase-player"
import { PhrasePractice } from "@/components/phrase-practice"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface PhraseWalkthroughProps {
  phrases: ReadonlyArray<{
    id: string
    text: string
    hi?: string
    tip?: string
    chunks?: readonly string[]
  }>
  onDone: () => void
}

export function PhraseWalkthrough({ phrases, onDone }: PhraseWalkthroughProps) {
  const [index, setIndex] = useState(0)
  const [stage, setStage] = useState<"learn" | "say">("learn")
  const [practiced, setPracticed] = useState<boolean[]>(() => phrases.map(() => false))
  const player = usePhrasePlayer()
  const phrase = phrases[index]
  if (!phrase) return null

  const playing = player.active?.id === phrase.id
  const canContinue = practiced[index] === true
  const lastPhrase = index === phrases.length - 1

  function moveOn() {
    haptic.select()
    if (lastPhrase) {
      onDone()
      return
    }
    setIndex((current) => current + 1)
    setStage("learn")
  }

  function handleVerdict(id: string) {
    if (id !== phrase.id) return
    setPracticed((current) => {
      const next = [...current]
      next[index] = true
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Phrase {index + 1} of {phrases.length}
        </span>
        <div
          className="flex items-center gap-1.5"
          aria-label={`Phrase ${index + 1} of ${phrases.length}`}
        >
          {phrases.map((item, phraseIndex) => (
            <span
              key={item.id}
              className={`size-1.5 rounded-full ${
                phraseIndex < index || (phraseIndex === index && canContinue)
                  ? "bg-indigo-400"
                  : phraseIndex === index
                    ? "bg-foreground"
                    : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      <Card
        key={`${phrase.id}-${stage}`}
        className="animate-in rounded-2xl border-border bg-card p-5 shadow-none duration-200 fade-in-0 slide-in-from-bottom-1"
      >
        {stage === "learn" ? (
          <div className="flex flex-col gap-6">
            <p className="text-xl font-semibold">{phrase.text}</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => (playing ? player.stop() : void player.play(phrase.id, phrase.text))}
                loading={player.active?.id === phrase.id && player.active.status === "loading"}
              >
                {playing ? <SquareIcon /> : <PlayIcon />}
                {playing ? "Stop" : "Listen"}
              </Button>
              <Button
                variant="outline"
                onClick={() => void player.play(phrase.id, phrase.text, 0.7)}
              >
                <PlayIcon />
                Slow
              </Button>
            </div>
            {phrase.chunks?.length ? (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">In parts</span>
                <div className="flex flex-wrap items-center gap-2">
                  {phrase.chunks.map((chunk, chunkIndex) => (
                    <span
                      key={`${chunk}-${chunkIndex}`}
                      className="rounded-full border border-border px-3 py-1 text-sm"
                    >
                      {chunk}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {phrase.hi ? (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Meaning</span>
                <Card className="rounded-2xl border-border bg-muted p-4 text-sm" lang="hi">
                  {phrase.hi}
                </Card>
              </div>
            ) : null}
            {phrase.tip ? (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <LightbulbIcon className="mt-0.5 size-4 shrink-0 text-amber-400" />
                <span>{phrase.tip}</span>
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-xl font-semibold">{phrase.text}</p>
            <PhrasePractice phrases={[phrase]} player={player} onVerdict={handleVerdict} />
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-3">
        {stage === "learn" ? (
          <Button variant="indigo" className="w-full" onClick={() => setStage("say")}>
            Now say it
          </Button>
        ) : (
          <>
            <Button variant="indigo" className="w-full" disabled={!canContinue} onClick={moveOn}>
              {lastPhrase ? "Start conversation" : "Next sentence"}
            </Button>
            <Button variant="ghost" size="sm" onClick={moveOn}>
              Skip
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
