// Browsers record webm/opus, but the STT provider documents WAV (16-bit PCM)
// as its recommended input. These helpers turn any recorded Blob into a
// 16 kHz mono WAV, which also gives the file a reliable duration header.

export const TARGET_SAMPLE_RATE = 16000

const BYTES_PER_SAMPLE = 2
const WAV_HEADER_BYTES = 44

/** Decodes a recorded Blob and resamples it to 16 kHz mono (browser only). */
export async function decodeToMono16k(blob: Blob): Promise<Float32Array> {
  const context = new AudioContext()
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer())
    // A mono OfflineAudioContext downmixes multichannel input automatically.
    const length = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE))
    const offline = new OfflineAudioContext(1, length, TARGET_SAMPLE_RATE)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start()
    const rendered = await offline.startRendering()
    return rendered.getChannelData(0)
  } finally {
    await context.close()
  }
}

/** Float samples in [-1, 1] to signed 16-bit integers (values are clamped first). */
export function floatTo16BitPCM(samples: Float32Array): Int16Array {
  const output = new Int16Array(samples.length)
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]))
    output[index] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
  }
  return output
}

/** Wraps 16-bit mono PCM in a standard 44-byte RIFF/WAVE header. */
export function encodeWav(pcm: Int16Array, sampleRate: number = TARGET_SAMPLE_RATE): Blob {
  const dataSize = pcm.length * BYTES_PER_SAMPLE
  const buffer = new ArrayBuffer(WAV_HEADER_BYTES + dataSize)
  const view = new DataView(buffer)

  const writeText = (offset: number, text: string): void => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index))
    }
  }

  writeText(0, "RIFF")
  view.setUint32(4, 36 + dataSize, true) // file size minus the first 8 bytes
  writeText(8, "WAVE")
  writeText(12, "fmt ")
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true) // byte rate
  view.setUint16(32, BYTES_PER_SAMPLE, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeText(36, "data")
  view.setUint32(40, dataSize, true)

  // Written sample by sample so the result is little-endian on any machine.
  for (let index = 0; index < pcm.length; index += 1) {
    view.setInt16(WAV_HEADER_BYTES + index * BYTES_PER_SAMPLE, pcm[index], true)
  }
  return new Blob([buffer], { type: "audio/wav" })
}

/** Recorded Blob in, 16 kHz mono WAV out, plus its duration in seconds. */
export async function blobToWav(blob: Blob): Promise<{ wav: Blob; durationSec: number }> {
  const samples = await decodeToMono16k(blob)
  return {
    wav: encodeWav(floatTo16BitPCM(samples)),
    durationSec: samples.length / TARGET_SAMPLE_RATE,
  }
}
