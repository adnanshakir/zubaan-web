"use client"

import { MicIcon, SquareIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { RecorderStatus } from "@/hooks/use-wav-recorder"

interface MicButtonProps {
  status: RecorderStatus
  disabled?: boolean
  onStart: () => void
  onStop: () => void
}

export function MicButton({ status, disabled = false, onStart, onStop }: MicButtonProps) {
  const recording = status === "recording"
  return (
    <div className="relative flex size-16 items-center justify-center">
      {recording ? (
        <span aria-hidden className="animate-pulse-ring absolute inset-0 rounded-full bg-primary" />
      ) : null}
      <Button
        size="icon"
        className="size-16"
        aria-label={recording ? "Stop recording" : "Start recording"}
        loading={status === "encoding"}
        disabled={disabled || status === "encoding"}
        onClick={recording ? onStop : onStart}
      >
        {recording ? (
          <SquareIcon className="size-5" />
        ) : status === "idle" ? (
          <MicIcon className="size-6" />
        ) : null}
      </Button>
    </div>
  )
}
