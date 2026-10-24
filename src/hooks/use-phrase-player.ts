"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { api, audioSrc, describeError } from "@/lib/api/client"
import { TTS_PROVIDER } from "@/lib/config"

export type PlayerStatus = "loading" | "playing"

/** Plays one phrase at a time. Starting another phrase stops the current one. */
export function usePhrasePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const requestRef = useRef(0)
  const [active, setActive] = useState<{ id: string; status: PlayerStatus } | null>(null)

  const stop = useCallback(() => {
    requestRef.current += 1
    audioRef.current?.pause()
    audioRef.current = null
    setActive(null)
  }, [])

  useEffect(() => stop, [stop])

  const play = useCallback(
    async (id: string, text: string) => {
      stop()
      const token = requestRef.current
      setActive({ id, status: "loading" })
      try {
        const result = await api.tts({ text, language: "en-IN", provider: TTS_PROVIDER })
        if (token !== requestRef.current) return
        const audio = new Audio(audioSrc(result.audioUrl) ?? undefined)
        audio.onended = () => {
          if (audioRef.current === audio) {
            audioRef.current = null
            setActive(null)
          }
        }
        audioRef.current = audio
        await audio.play()
        if (token === requestRef.current) setActive({ id, status: "playing" })
      } catch (error) {
        if (token !== requestRef.current) return
        audioRef.current = null
        setActive(null)
        toast.error(describeError(error))
      }
    },
    [stop],
  )

  return { active, play, stop }
}
