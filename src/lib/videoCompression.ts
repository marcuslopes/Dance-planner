import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

export const VIDEO_SIZE_LIMIT_MB = 5

// Lazy singleton — the WASM core (~30 MB) is downloaded only on first use
let ffmpegInstance: FFmpeg | null = null

async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance

  const ffmpeg = new FFmpeg()

  if (onLog) {
    ffmpeg.on('log', ({ message }) => onLog(message))
  }

  // Use multi-threaded core when SharedArrayBuffer is available, otherwise fall back
  // to single-threaded core (no SharedArrayBuffer required)
  if (typeof SharedArrayBuffer !== 'undefined') {
    const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
    })
  } else {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })
  }

  ffmpegInstance = ffmpeg
  return ffmpeg
}

/**
 * Reads video duration (in seconds) by loading the file's metadata in a
 * temporary <video> element. Returns null if the browser can't decode it.
 */
function getVideoDuration(file: File): Promise<number | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(isFinite(video.duration) ? video.duration : null)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    video.src = url
  })
}

/**
 * Compresses a video file so it fits within `targetMB` megabytes.
 * Resolution is capped at 720p. Output is always MP4 (H.264 + AAC).
 *
 * @param file       Original video file from <input type="file">
 * @param targetMB   Target file size in megabytes (default: VIDEO_SIZE_LIMIT_MB)
 * @param onProgress Callback with compression progress 0–100
 */
export async function compressVideo(
  file: File,
  targetMB: number = VIDEO_SIZE_LIMIT_MB,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  // If already small enough, return as-is (converted to mp4 name for consistency)
  if (file.size <= targetMB * 1024 * 1024) {
    onProgress?.(100)
    return file
  }

  const ffmpeg = await getFFmpeg()

  // Probe duration for bitrate calculation
  const duration = await getVideoDuration(file)

  // Target bitrate in kbps: leave 10% headroom, subtract 64k for audio
  const targetBits = targetMB * 8 * 1024 * 1024
  const videoBitrateKbps = duration
    ? Math.max(100, Math.floor((targetBits / duration) * 0.9 / 1000) - 64)
    : 400  // fallback: 400kbps if duration unknown

  // Wire up progress events
  ffmpeg.on('progress', ({ progress }) => {
    onProgress?.(Math.round(Math.min(progress, 1) * 100))
  })

  const inputName = 'input' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const outputName = 'output.mp4'

  await ffmpeg.writeFile(inputName, await fetchFile(file))

  await ffmpeg.exec([
    '-i', inputName,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-b:v', `${videoBitrateKbps}k`,
    '-maxrate', `${videoBitrateKbps * 2}k`,
    '-bufsize', `${videoBitrateKbps * 4}k`,
    '-c:a', 'aac',
    '-b:a', '64k',
    '-vf', 'scale=-2:\'min(720,ih)\'',
    '-movflags', '+faststart',
    '-y',
    outputName,
  ])

  const data = await ffmpeg.readFile(outputName)
  onProgress?.(100)

  // Clean up virtual FS
  await ffmpeg.deleteFile(inputName)
  await ffmpeg.deleteFile(outputName)

  // FFmpeg may return Uint8Array with SharedArrayBuffer; copy to a regular ArrayBuffer for Blob
  const bytes = data instanceof Uint8Array
    ? new Uint8Array(data.buffer instanceof SharedArrayBuffer ? data.buffer.slice(0) : data.buffer)
    : data
  return new Blob([bytes as BlobPart], { type: 'video/mp4' })
}
