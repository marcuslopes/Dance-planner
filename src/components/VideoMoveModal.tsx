import { useEffect, useState } from 'react'
import { X, Check, ArrowRightLeft } from 'lucide-react'
import { format } from 'date-fns'
import { useAppStore } from '../store/appStore'
import type { VideoRecord } from '../types'

interface Props {
  video: VideoRecord
  onClose: () => void
}

function toDateValue(ts: number) { return new Date(ts).toISOString().slice(0, 10) }
function fromDateValue(s: string) { return new Date(s).getTime() }

export function VideoMoveModal({ video, onClose }: Props) {
  const { packages, attendance, moveVideo } = useAppStore()
  const [selectedPackageId, setSelectedPackageId] = useState(video.packageId)
  const [selectedAttendedAt, setSelectedAttendedAt] = useState(video.attendedAt)
  const [saving, setSaving] = useState(false)

  const activePackages = packages
    .filter(p => !p.archivedAt)
    .sort((a, b) => b.createdAt - a.createdAt)

  const targetAttendance = attendance
    .filter(a => a.packageId === selectedPackageId)
    .sort((a, b) => b.attendedAt - a.attendedAt)

  useEffect(() => {
    if (targetAttendance.length > 0) {
      setSelectedAttendedAt(targetAttendance[0].attendedAt)
    }
  }, [selectedPackageId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (selectedPackageId === video.packageId && selectedAttendedAt === video.attendedAt) {
      onClose()
      return
    }
    setSaving(true)
    await moveVideo(video.id, selectedPackageId, selectedAttendedAt)
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <ArrowRightLeft size={18} style={{ color: '#60a5fa' }} />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              Move video
            </h3>
          </div>

          {/* Video being moved */}
          <div style={{
            marginBottom: 20, padding: '10px 12px', borderRadius: 12,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              {video.title || 'Class video'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {format(video.attendedAt, 'MMM d, yyyy')} · {(video.sizeBytes / 1024 / 1024).toFixed(1)} MB
            </div>
          </div>

          {/* Package selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
              Move to package
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activePackages.map(pkg => {
                const isSelected = pkg.id === selectedPackageId
                return (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                      background: isSelected ? `${pkg.color}18` : 'var(--bg-card)',
                      border: isSelected ? `1.5px solid ${pkg.color}` : '1px solid var(--border)',
                      textAlign: 'left', width: '100%',
                    }}
                  >
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: pkg.color, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {pkg.instructorName}
                      </span>
                      <span style={{
                        marginLeft: 6, fontSize: 12, color: 'var(--text-secondary)',
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                        borderRadius: 6, padding: '1px 6px',
                      }}>
                        {pkg.label}
                      </span>
                    </div>
                    {isSelected && <Check size={15} style={{ color: pkg.color, flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date selector */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
              Class date
            </div>
            {targetAttendance.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {targetAttendance.map((rec, i) => {
                  const isSelected = rec.attendedAt === selectedAttendedAt
                  const classNum = targetAttendance.length - i
                  return (
                    <button
                      key={rec.id}
                      onClick={() => setSelectedAttendedAt(rec.attendedAt)}
                      style={{
                        padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                        background: isSelected ? '#7c3aed' : 'var(--bg-card)',
                        border: isSelected ? '1.5px solid #7c3aed' : '1px solid var(--border)',
                        color: isSelected ? '#fff' : 'var(--text-primary)',
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      Class #{classNum}
                    </button>
                  )
                })}
              </div>
            ) : (
              <>
                <input
                  type="date"
                  value={toDateValue(selectedAttendedAt)}
                  onChange={e => setSelectedAttendedAt(fromDateValue(e.target.value))}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: 15,
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  This package has no recorded classes — pick a date manually.
                </div>
              </>
            )}
          </div>

          {/* Confirm */}
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
            {saving ? 'Moving…' : 'Move video'}
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
