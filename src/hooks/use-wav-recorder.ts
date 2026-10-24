"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { blobToWav } from "@/lib/audio/wav"

export const MAX_RECORD_SECONDS = 25 // the backend rejects audio over 30 seconds
const MIN_RECORD_SECONDS = 0.5

export type RecorderStatus = "idle" | "recording" | "encoding"

interface UseWavRecorderOptions {
  /** Called with a 16 kHz mono WAV when a recording finishes (manual or auto stop). */
  onRecorded: (wav: Blob) => void
  /** Called with a user-readable message when recording fails. */
  onError: (message: string) => void
}

function describeMicError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Microphone access was blocked. Allow it in your browser settings."
    }
    if (error.name === "NotFoundError") return "No microphone found."
    if (error.name === "NotReadableError") return "Your microphone is being used by another app."
  }
  return "Couldn't start recording. Try again."
}

export function useWavRecorder({ onRecorded, onError }: UseWavRecorderOptions) {
  const [status, setStatus] = useState<RecorderStatus>("idle")
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timeoutRef = useRef<number | null>(null)
  const pendingRequestRef = useRef<Promise<MediaStream> | null>(null)
  const mountedRef = useRef(false)
  // Always call the latest callbacks without re-creating start/stop.
  const callbacksRef = useRef({ onRecorded, onError })

  useEffect(() => {
    callbacksRef.current = { onRecorded, onError }
  })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const releaseMic = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state === "recording") recorder.stop()
  }, [])

  const start = useCallback(async () => {
    if (recorderRef.current || pendingRequestRef.current) return
    try {
      const request = navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      pendingRequestRef.current = request
      const stream = await request
      pendingRequestRef.current = null
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        recorderRef.current = null
        releaseMic()
        setStatus("encoding")
        try {
          const { wav, durationSec } = await blobToWav(blob)
          if (durationSec < MIN_RECORD_SECONDS) {
            callbacksRef.current.onError("That was too short. Tap, speak, then tap again.")
          } else {
            callbacksRef.current.onRecorded(wav)
          }
        } catch {
          callbacksRef.current.onError("Couldn't process that recording. Try again.")
        } finally {
          setStatus("idle")
        }
      }

      recorderRef.current = recorder
      recorder.start()
      setStatus("recording")
      timeoutRef.current = window.setTimeout(stop, MAX_RECORD_SECONDS * 1000)
    } catch (error) {
      pendingRequestRef.current = null
      if (!mountedRef.current) return
      recorderRef.current = null
      releaseMic()
      setStatus("idle")
      callbacksRef.current.onError(describeMicError(error))
    }
  }, [releaseMic, stop])

  // Leaving the screen mid-recording: stop quietly, no callbacks, mic released.
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current
      if (recorder) {
        recorder.onstop = null
        if (recorder.state === "recording") recorder.stop()
      }
      recorderRef.current = null
      releaseMic()
    }
  }, [releaseMic])

  return { status, start, stop }
}
