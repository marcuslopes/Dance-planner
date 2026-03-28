import { useRef, useState } from 'react'
import { X, Upload, Film } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { VIDEO_SIZE_LIMIT_MB } from '../lib/videoCompression'
import toast from 'react-hot-toast'

interface Props {
  packageId: string
  defaultAttendedAt: number
  onClose: () => void
}

export function VideoUploadModal({ packageId, defaultAttendedAt, onClose }: Props) {
  const { uploadClassVideo } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [attendedAt, setAttendedAt] = useState<number>(defaultAttendedAt)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')

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
    if (f.size > 200 * 1024 * 1024) {
      toast.error('Video is very large (>200 MB). Consider trimming it first.', { duration: 6000 })
    }
    setFile(f)
  }

  function handleUpload() {
    if (!file) return
    void uploadClassVideo(packageId, file, attendedAt, title, notes)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 60,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet — flat scrollable, no flex tricks */}
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
            maxHeight: '92dvh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '16px 24px',
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            boxSizing: 'border-box',
            pointerEvents: 'auto',
          }}
        >
          {/* Handle + close */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--text-muted)' }} />
            </div>
            <button onClick={onClose} style={iconBtn}>
              <X size={20} />
            </button>
          </div>

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

          {/* Title */}
          <label style={{ display: 'block', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
              Title <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Footwork practice"
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

          {/* Notes */}
          <label style={{ display: 'block', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
              Class notes <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What happened in this class?"
              rows={3}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: 15,
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
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
              marginBottom: 16,
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

          {/* CTA */}
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
            Save to Google Drive
          </button>
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
