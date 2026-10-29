"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { blobToWav } from "@/lib/audio/wav"

export const MAX_RECORD_SECONDS = 25 // the backend rejects audio over 30 seconds
const MIN_RECORD_SECONDS = 0.4
const MIN_PEAK = 0.03

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

async function getPcmStats(wav: Blob): Promise<{ durationSec: number; peak: number }> {
  const buffer = await wav.arrayBuffer()
  const view = new DataView(buffer)
  let channels = 1
  let sampleRate = 16000
  let bitsPerSample = 16
  let dataOffset = 0
  let dataLength = 0

  for (let offset = 12; offset + 8 <= view.byteLength;) {
    const chunkSize = view.getUint32(offset + 4, true)
    const chunkEnd = offset + 8 + chunkSize
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    )
    if (chunkId === "fmt " && offset + 24 <= view.byteLength) {
      channels = view.getUint16(offset + 10, true)
      sampleRate = view.getUint32(offset + 12, true)
      bitsPerSample = view.getUint16(offset + 22, true)
    } else if (chunkId === "data") {
      dataOffset = offset + 8
      dataLength = Math.min(chunkSize, view.byteLength - dataOffset)
      break
    }
    offset = chunkEnd + (chunkSize % 2)
  }

  const bytesPerSample = bitsPerSample / 8
  const frameSize = bytesPerSample * channels
  if (!dataLength || !sampleRate || !channels || !Number.isInteger(bytesPerSample)) {
    throw new Error("Invalid WAV data")
  }

  let peak = 0
  const sampleCount = Math.floor(dataLength / bytesPerSample)
  for (let index = 0; index < sampleCount; index += 1) {
    const offset = dataOffset + index * bytesPerSample
    let sample: number
    if (bitsPerSample === 8) sample = (view.getUint8(offset) - 128) / 128
    else if (bitsPerSample === 16) sample = view.getInt16(offset, true) / 32768
    else if (bitsPerSample === 24) {
      const value =
        view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16)
      sample = (value & 0x800000 ? value - 0x1000000 : value) / 8388608
    } else if (bitsPerSample === 32) sample = view.getInt32(offset, true) / 2147483648
    else throw new Error("Unsupported WAV format")
    peak = Math.max(peak, Math.abs(sample))
  }

  return {
    durationSec: Math.floor(dataLength / frameSize) / sampleRate,
    peak,
  }
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
          const { wav } = await blobToWav(blob)
          const { durationSec, peak } = await getPcmStats(wav)
          if (durationSec < MIN_RECORD_SECONDS) {
            callbacksRef.current.onError("That was too short. Hold the mic a little longer.")
          } else if (peak < MIN_PEAK) {
            callbacksRef.current.onError(
              "We didn't hear anything. Check that your mic is on and try again.",
            )
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
