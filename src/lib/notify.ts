import { toast } from "sonner"
import { haptic } from "@/lib/haptics"
import { sfx } from "@/lib/sfx"

/** Shows an error toast and fires the error haptic. Use instead of toast.error. */
export function notifyError(message: string): void {
  haptic.error()
  sfx.play("error")
  toast.error(message)
}
