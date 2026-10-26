// Haptic feedback for the mobile web (https://haptics.lochie.me).
// A plain module instead of a hook, so it works in any event handler or
// async catch block. On the server it does nothing.
//
// Phones vibrate. Browsers that cannot vibrate (desktop, iOS Safari) play the
// library's click sound instead, so the feedback is audible there. The sound
// can be switched off with setSoundEnabled(false); the choice is remembered.

import { WebHaptics } from "web-haptics"

type HapticInput = Parameters<WebHaptics["trigger"]>[0]

const SOUND_KEY = "zubaan:sounds"
const SOUND_EVENT = "zubaan:sounds-changed"

let instance: WebHaptics | null = null

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(SOUND_KEY)
  } catch {
    return null // storage blocked (private mode)
  }
}

/** Sound is on by default only where the device cannot vibrate. */
function soundDefault(): boolean {
  return !("vibrate" in navigator)
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false
  const stored = readStorage()
  return stored === null ? soundDefault() : stored === "on"
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return
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
  instance ??= new WebHaptics({ debug: isSoundEnabled() })
  void instance.trigger(input, intensity === undefined ? undefined : { intensity })
}

export const haptic = {
  /** Light tick: any button press or navigation tap. */
  tap: () => run(8, 0.4),
  /** Slightly firmer tick: choosing an option in a list. */
  select: () => run(12, 0.55),
  /** Two taps: something worked (word said right, onboarding done, lesson finished). */
  success: () => run("success"),
  /** Strong tap then soft tap: heads-up (almost right, recording started or stopped). */
  nudge: () => run("nudge"),
  /** Three sharp taps: something failed. */
  error: () => run("error"),
}
