"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/** Plays one audio file at a time from a ready-made URL. Starting another stops the first. */
export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const stop = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    setActiveId(null)
  }, [])

  // Stop playback when the screen unmounts.
  useEffect(() => stop, [stop])

  const play = useCallback(
    async (id: string, src: string) => {
      stop()
      const audio = new Audio(src)
      audioRef.current = audio
      audio.onended = () => {
        if (audioRef.current === audio) {
          audioRef.current = null
          setActiveId(null)
        }
      }
      setActiveId(id)
      try {
        await audio.play()
      } catch {
        // Autoplay blocked, or stopped by a newer play(): reset only if still current.
        if (audioRef.current === audio) {
          audioRef.current = null
          setActiveId(null)
        }
      }
    },
    [stop],
  )

  return { activeId, play, stop }
}
