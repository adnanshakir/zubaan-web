import { isSoundEnabled } from "@/lib/haptics"

export type SoundName =
  | "tap"
  | "select"
  | "correct"
  | "wrong"
  | "streak"
  | "complete"
  | "unlock"
  | "mic-start"
  | "mic-stop"
  | "error"

const sounds: Record<SoundName, HTMLAudioElement[]> = {} as Record<SoundName, HTMLAudioElement[]>

export const sfx = {
  play(name: SoundName, rate = 1): void {
    if (typeof window === "undefined" || !isSoundEnabled()) return
    const elements =
      sounds[name] ??
      (sounds[name] = Array.from({ length: 2 }, () => {
        const fileName = name === "mic-stop" ? "mic-end" : name
        const audio = new Audio(`/sfx/${fileName}.mp3`)
        audio.volume = name === "tap" || name === "select" ? 0.3 : 0.5
        return audio
      }))
    const audio = elements.find((element) => element.paused) ?? elements[0]
    audio.playbackRate = rate
    audio.currentTime = 0
    void audio.play().catch(() => undefined)
  },
}
