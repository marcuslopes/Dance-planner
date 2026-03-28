import { useAppStore } from '../store/appStore'

export function UploadProgressBar() {
  const isVideoUploading = useAppStore(s => s.isVideoUploading)
  const progress = useAppStore(s => s.videoUploadProgress)

  if (!isVideoUploading) return null

  const label = progress < 70
    ? `Compressing… ${progress}%`
    : `Uploading to Drive… ${progress}%`

  return (
    <div style={{
      position: 'fixed', bottom: 'calc(72px + max(8px, env(safe-area-inset-bottom, 0px)))', left: 0, right: 0,
      display: 'flex', justifyContent: 'center',
      zIndex: 55, pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 20, padding: '8px 16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        minWidth: 220, maxWidth: 340,
      }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
            width: `${progress}%`,
            transition: 'width 400ms ease',
          }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: 500 }}>
          {label}
        </span>
      </div>
    </div>
  )
}
