import { useRef, useState } from 'react'
import { X, Upload, Film, CheckCircle } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { format } from 'date-fns'
import { VIDEO_SIZE_LIMIT_MB } from '../lib/videoCompression'
import toast from 'react-hot-toast'

interface Props {
  packageId: string
  defaultAttendedAt: number  // epoch ms — pre-filled date
  onClose: () => void
}

type Step = 'pick' | 'uploading' | 'done'

export function VideoUploadModal({ packageId, defaultAttendedAt, onClose }: Props) {
  const { uploadClassVideo, videoUploadProgress } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [attendedAt, setAttendedAt] = useState<number>(defaultAttendedAt)
  const [step, setStep] = useState<Step>('pick')
  const [notionUrl, setNotionUrl] = useState<string | null>(null)

  // Format epoch ms to YYYY-MM-DD for <input type="date">
  function toDateValue(ts: number) {
    return new Date(ts).toISOString().slice(0, 10)
  }

  function fromDateValue(s: string) {
    return new Date(s).getTime()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (!f) return
    if (!f.type.startsWith('video/')) {
      toast.error('Please select a video file')
      return
    }
    setFile(f)
  }

  async function handleUpload() {
    if (!file) return
    setStep('uploading')
    try {
      // Capture the Notion URL from store after upload completes
      await uploadClassVideo(packageId, file, attendedAt)
      // Grab the most recently added video for this package from store
      const { videos } = useAppStore.getState()
      const latest = videos.find(v => v.packageId === packageId)
      setNotionUrl(latest?.notionPageUrl ?? null)
      setStep('done')
    } catch {
      // error toast handled in store
      setStep('pick')
    }
  }

  const progressLabel =
    videoUploadProgress < 70
      ? `Compressing… ${videoUploadProgress}%`
      : videoUploadProgress < 85
        ? 'Building Notion pages…'
        : `Uploading to Notion… ${videoUploadProgress}%`

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={step !== 'uploading' ? onClose : undefined}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 60,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        zIndex: 70, pointerEvents: 'none',
      }}>
        <div
          className="sheet-enter"
          style={{
            width: '100%', maxWidth: 430,
            background: 'var(--bg-elevated)',
            borderRadius: '24px 24px 0 0',
            padding: '16px 24px',
            paddingBottom: 'max(32px, var(--safe-bottom))',
            pointerEvents: 'auto',
          }}
        >
          {/* Handle + close */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--text-muted)' }} />
            </div>
            {step !== 'uploading' && (
              <button onClick={onClose} style={iconBtn}>
                <X size={20} />
              </button>
            )}
          </div>

          {step === 'pick' && (
            <>
              <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                Upload class video
              </h3>

              {/* Date picker */}
              <label style={{ display: 'block', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
                  Class date
                </div>
                <input
                  type="date"
                  value={toDateValue(attendedAt)}
                  onChange={e => setAttendedAt(fromDateValue(e.target.value))}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: 15,
                    boxSizing: 'border-box',
                  }}
                />
              </label>

              {/* File picker */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 16, padding: '24px 16px',
                  textAlign: 'center', cursor: 'pointer',
                  marginBottom: 20,
                  background: file ? 'rgba(124,58,237,0.06)' : 'transparent',
                  borderColor: file ? '#7c3aed' : 'var(--border)',
                  transition: 'all 200ms ease',
                }}
              >
                <Film size={32} style={{ color: file ? '#7c3aed' : 'var(--text-muted)', marginBottom: 8 }} />
                {file ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                      {file.size > VIDEO_SIZE_LIMIT_MB * 1024 * 1024
                        ? ` → will compress to ≤${VIDEO_SIZE_LIMIT_MB} MB`
                        : ' (no compression needed)'}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Tap to select a video
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Will be compressed to ≤{VIDEO_SIZE_LIMIT_MB} MB
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              <button
                onClick={handleUpload}
                disabled={!file}
                style={{
                  width: '100%', padding: '15px',
                  borderRadius: 16, border: 'none',
                  background: file
                    ? 'linear-gradient(135deg, #7c3aed, #7c3aedcc)'
                    : 'rgba(255,255,255,0.06)',
                  color: file ? '#fff' : 'var(--text-muted)',
                  fontSize: 16, fontWeight: 700,
                  cursor: file ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: file ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
                }}
              >
                <Upload size={18} />
                Save to Notion
              </button>
            </>
          )}

          {step === 'uploading' && (
            <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
              <Film size={40} style={{ color: '#7c3aed', marginBottom: 16, opacity: 0.8 }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
                {progressLabel}
              </div>
              {/* Progress bar */}
              <div style={{
                height: 6, borderRadius: 3,
                background: 'var(--border)', overflow: 'hidden', marginBottom: 12,
              }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                  width: `${videoUploadProgress}%`,
                  transition: 'width 400ms ease',
                }} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Please keep the app open
              </div>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
              <CheckCircle size={48} style={{ color: '#10b981', marginBottom: 16 }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Saved to Notion!
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
                {format(attendedAt, 'MMMM d, yyyy')} class video
              </div>
              {notionUrl && (
                <a
                  href={notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block', padding: '12px',
                    borderRadius: 12, border: '1px solid var(--border)',
                    color: '#7c3aed', fontSize: 14, fontWeight: 600,
                    textDecoration: 'none', marginBottom: 12,
                    background: 'rgba(124,58,237,0.06)',
                  }}
                >
                  Open in Notion ↗
                </a>
              )}
              <button
                onClick={onClose}
                style={{
                  width: '100%', padding: '13px',
                  borderRadius: 12, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-secondary)',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const iconBtn: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '8px', cursor: 'pointer',
  color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
