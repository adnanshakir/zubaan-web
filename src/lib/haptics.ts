// Haptic feedback for the mobile web (https://haptics.lochie.me).
// A plain module instead of a hook, so it works in any event handler or
// async catch block. On the server it does nothing.
//
// The app's sound effects are handled by sfx.ts; web-haptics is vibration-only.

import { WebHaptics } from "web-haptics"

type HapticInput = Parameters<WebHaptics["trigger"]>[0]

const SOUND_KEY = "zubaan:sounds"
const SOUND_EVENT = "zubaan:sounds-changed"

let instance: WebHaptics | null = null
let soundPreference: boolean | null = null

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(SOUND_KEY)
  } catch {
    return null // storage blocked (private mode)
  }
}

/** Sound is on by default on every device. */
function soundDefault(): boolean {
  return true
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false
  const stored = readStorage()
  if (stored !== null) {
    soundPreference = stored === "on"
    return soundPreference
  }
  return soundPreference ?? soundDefault()
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return
  soundPreference = enabled
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? "on" : "off")
  } catch {
    // Keep going: the toggle still works for this page view.
  }
  instance?.setDebug(enabled)
  window.dispatchEvent(new Event(SOUND_EVENT))
}

/** For useSyncExternalStore(subscribeSound, isSoundEnabled, () => false). */
export function subscribeSound(onChange: () => void): () => void {
  window.addEventListener(SOUND_EVENT, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(SOUND_EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

function run(input: HapticInput, intensity?: number): void {
  if (typeof window === "undefined") return
  instance ??= new WebHaptics({ debug: false })
  void instance.trigger(input, intensity === undefined ? undefined : { intensity })
}

export const haptic = {
  /** Light tick: any button press or navigation tap. */
  tap: () => {
    run(8, 0.4)
    void import("@/lib/sfx").then(({ sfx }) => sfx.play("tap"))
  },
  /** Slightly firmer tick: choosing an option in a list. */
  select: () => {
    run(12, 0.55)
    void import("@/lib/sfx").then(({ sfx }) => sfx.play("select"))
  },
  /** Two taps: something worked (word said right, onboarding done, lesson finished). */
  success: () => run("success"),
  /** Strong tap then soft tap: heads-up (almost right, recording started or stopped). */
  nudge: () => run("nudge"),
  /** Three sharp taps: something failed. */
  error: () => run("error"),
}
