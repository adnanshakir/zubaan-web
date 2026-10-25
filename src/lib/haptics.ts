// Haptic feedback for the mobile web (https://haptics.lochie.me).
// A plain module instead of a hook, so it works in any event handler or
// async catch block. It does nothing on the server and on devices without
// vibration support (most desktops).

import { WebHaptics } from "web-haptics"

type HapticInput = Parameters<WebHaptics["trigger"]>[0]

let instance: WebHaptics | null = null

function run(input: HapticInput, intensity?: number): void {
  if (typeof window === "undefined") return
  instance ??= new WebHaptics()
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
