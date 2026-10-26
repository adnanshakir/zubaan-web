import { toast } from "sonner"
import { haptic } from "@/lib/haptics"

/** Shows an error toast and fires the error haptic. Use instead of toast.error. */
export function notifyError(message: string): void {
  haptic.error()
  toast.error(message)
}
