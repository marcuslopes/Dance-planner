import { format } from 'date-fns'
import { useAppStore } from '../store/appStore'
import type { Inscription } from '../types'

const PAYMENT_COLOR: Record<Inscription['paymentStatus'], string> = {
  paid: '#10b981', partial: '#f59e0b', unpaid: '#f43f5e',
}

interface Props {
  classId: string
  onClose: () => void
}

export function TeacherClassDetail({ classId, onClose }: Props) {
  const tc = useAppStore(s => s.teacherClasses.find(c => c.id === classId))
  const inscriptions = useAppStore(s => s.inscriptions.filter(i => i.teacherClassId === classId))
  const openTeacherClassForm = useAppStore(s => s.openTeacherClassForm)
  const openInscriptionForm = useAppStore(s => s.openInscriptionForm)

  if (!tc) return null

  const duration = tc.endTime - tc.startTime
  const durationMin = Math.round(duration / 60000)
  const durationLabel = durationMin >= 60
    ? `${Math.floor(durationMin / 60)}h${durationMin % 60 ? ` ${durationMin % 60}m` : ''}`
    : `${durationMin}m`

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const r = tc.recurrence
  let scheduleLabel = format(new Date(tc.startTime), 'EEE, MMM d – HH:mm')
  if (r) {
    const timeStr = format(new Date(tc.startTime), 'HH:mm')
    if (r.frequency === 'weekly' && r.daysOfWeek.length > 0) {
      scheduleLabel = `Every ${r.daysOfWeek.map(d => days[d]).join(', ')} at ${timeStr}`
    } else if (r.frequency === 'biweekly' && r.daysOfWeek.length > 0) {
      scheduleLabel = `Every other ${r.daysOfWeek.map(d => days[d]).join(', ')} at ${timeStr}`
    } else {
      scheduleLabel = `Monthly at ${timeStr}`
    }
  }

  const paidCount = inscriptions.filter(i => i.paymentStatus === 'paid').length
  const unpaidCount = inscriptions.filter(i => i.paymentStatus === 'unpaid').length

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 250,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 430, margin: '0 auto',
        background: 'var(--bg-base)', borderRadius: '20px 20px 0 0',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.25s ease',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: tc.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{tc.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{tc.style} · {durationLabel}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => openTeacherClassForm(tc)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: '4px 10px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}
              >Edit</button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Meta */}
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {scheduleLabel}
            </div>
            {tc.location && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {tc.location}
              </div>
            )}
            {tc.pricePerStudent != null && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {tc.baseCurrency} {tc.pricePerStudent} / class / student
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <Stat label="Enrolled" value={String(inscriptions.length)} />
            <Stat label="Paid" value={String(paidCount)} color="#10b981" />
            <Stat label="Unpaid" value={String(unpaidCount)} color="#f43f5e" />
          </div>
        </div>

        {/* Students list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {inscriptions.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No students yet. Tap + to add one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {inscriptions.map(ins => (
                <button
                  key={ins.id}
                  onClick={() => openInscriptionForm(classId, 'class', ins)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', background: 'var(--bg-elevated)',
                    borderRadius: 12, border: '1px solid var(--border)',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {ins.studentName}
                    </div>
                    {ins.contactInfo && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{ins.contactInfo}</div>
                    )}
                    {ins.amountPaid != null && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {ins.baseCurrency} {ins.amountPaid} paid
                      </div>
                    )}
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    textTransform: 'capitalize',
                    background: `${PAYMENT_COLOR[ins.paymentStatus]}22`,
                    color: PAYMENT_COLOR[ins.paymentStatus],
                  }}>
                    {ins.paymentStatus}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add student button */}
        <div style={{ padding: '12px 16px 20px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => openInscriptionForm(classId, 'class')}
            style={{
              width: '100%', padding: '12px', borderRadius: 12,
              border: '1.5px dashed var(--border)', background: 'transparent',
              color: '#a78bfa', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add student
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: color ?? 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{label}</div>
    </div>
  )
}
