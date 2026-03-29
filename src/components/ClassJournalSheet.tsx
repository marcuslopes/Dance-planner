import { useState } from 'react'
import { useAppStore, getAttendanceForPackage } from '../store/appStore'
import type { AttendanceRecord, Package } from '../types'

interface Props {
  record: AttendanceRecord
  pkg: Package
  onClose: () => void
}

export function ClassJournalSheet({ record, pkg, onClose }: Props) {
  const { attendance, updateAttendance } = useAppStore()
  const pkgAttendance = getAttendanceForPackage(attendance, pkg.id)
  // Class number = position in list sorted descending (most recent = highest number)
  const classIndex = pkgAttendance.findIndex(a => a.id === record.id)
  const classNumber = pkgAttendance.length - classIndex

  const [rating, setRating] = useState<number | null>(record.rating)
  const [learnedNote, setLearnedNote] = useState(record.learnedNote ?? '')
  const [practiceNote, setPracticeNote] = useState(record.practiceNote ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await updateAttendance(record.id, {
        rating,
        learnedNote: learnedNote.trim() || null,
        practiceNote: practiceNote.trim() || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 60, backdropFilter: 'blur(4px)',
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
            paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
            maxHeight: '80dvh',
            display: 'flex', flexDirection: 'column',
            pointerEvents: 'auto',
          }}
        >
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 20px 0' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--text-muted)' }} />
          </div>

          {/* Header */}
          <div style={{ padding: '16px 24px 12px' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              How was class #{classNumber}?
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {pkg.instructorName} · {pkg.label}
            </p>
          </div>

          <div className="scroll-area" style={{ flex: 1, padding: '0 24px 16px', overflowY: 'auto' }}>
            {/* Star rating */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Rating
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(rating === star ? null : star)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 32, padding: 0, lineHeight: 1,
                      color: rating !== null && star <= rating ? pkg.color : 'var(--border)',
                      transition: 'color 150ms ease, transform 100ms ease',
                    }}
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* What did you learn? */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                What did you learn?
              </label>
              <textarea
                rows={3}
                value={learnedNote}
                onChange={e => setLearnedNote(e.target.value)}
                placeholder="New moves, technique tips, combos…"
                style={{
                  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 10, color: 'var(--text-primary)', fontSize: 14,
                  resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                  outline: 'none',
                }}
              />
            </div>

            {/* What to practice? */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                What to practice?
              </label>
              <textarea
                rows={3}
                value={practiceNote}
                onChange={e => setPracticeNote(e.target.value)}
                placeholder="Focus areas for next time…"
                style={{
                  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 10, color: 'var(--text-primary)', fontSize: 14,
                  resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                  outline: 'none',
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, padding: '13px', borderRadius: 12, border: 'none',
                  background: `linear-gradient(135deg, ${pkg.color}, ${pkg.color}cc)`,
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {saving ? 'Saving…' : 'Save notes'}
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '13px 20px', borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-secondary)',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
