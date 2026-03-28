import { useState } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import type { VideoRecord } from '../types'

interface Props {
  video: VideoRecord
  onClose: () => void
}

export function VideoEditModal({ video, onClose }: Props) {
  const { updateVideo } = useAppStore()
  const [title, setTitle] = useState(video.title)
  const [notes, setNotes] = useState(video.notes)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await updateVideo(video.id, { title, notes })
    setSaving(false)
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
            Edit video
          </h3>

          {/* Title */}
          <label style={{ display: 'block', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
              Title
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
          <label style={{ display: 'block', marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
              Class notes
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What happened in this class?"
              rows={4}
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

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: '15px',
              borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg, #7c3aed, #7c3aedcc)',
              color: '#fff',
              fontSize: 16, fontWeight: 700,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
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
