import { format } from 'date-fns'
import type { TeacherClass } from '../types'
import { expandOccurrences } from '../lib/recurrence'

interface Props {
  tc: TeacherClass
  enrolledCount: number
  onClick: () => void
}

function recurrenceSummary(tc: TeacherClass): string {
  const r = tc.recurrence
  if (!r) return 'One-time'
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  if (r.frequency === 'weekly' && r.daysOfWeek.length > 0) {
    return `Every ${r.daysOfWeek.map(d => days[d]).join(', ')}`
  }
  if (r.frequency === 'biweekly' && r.daysOfWeek.length > 0) {
    return `Every other ${r.daysOfWeek.map(d => days[d]).join(', ')}`
  }
  return r.frequency.charAt(0).toUpperCase() + r.frequency.slice(1)
}

function nextOccurrence(tc: TeacherClass): string | null {
  const now = Date.now()
  if (!tc.recurrence) {
    if (tc.startTime > now) return format(new Date(tc.startTime), 'EEE, MMM d')
    return null
  }
  // Use expandOccurrences to find the next occurrence within the next 90 days
  const lookahead = now + 90 * 24 * 60 * 60 * 1000
  // Build a ScheduledClass-like object compatible with expandOccurrences
  const asScheduled = {
    id: tc.id,
    packageId: null,
    title: tc.title,
    startTime: tc.startTime,
    endTime: tc.endTime,
    location: tc.location,
    recurrence: tc.recurrence,
    googleCalendarEventId: tc.googleCalendarEventId,
    notes: tc.notes,
    createdAt: tc.createdAt,
    updatedAt: tc.updatedAt,
  }
  const occurrences = expandOccurrences(asScheduled, lookahead)
  const next = occurrences.find(ts => ts > now)
  if (!next) return null
  return format(new Date(next), 'EEE, MMM d')
}

export function TeacherClassCard({ tc, enrolledCount, onClick }: Props) {
  const duration = tc.endTime - tc.startTime
  const durationMin = Math.round(duration / 60000)
  const durationLabel = durationMin >= 60
    ? `${Math.floor(durationMin / 60)}h${durationMin % 60 ? ` ${durationMin % 60}m` : ''}`
    : `${durationMin}m`

  const next = nextOccurrence(tc)

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--bg-elevated)',
        borderRadius: 14,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        padding: 0,
      }}
    >
      {/* Color accent bar */}
      <div style={{ width: 4, flexShrink: 0, background: tc.color }} />

      {/* Content */}
      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {tc.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {tc.style} · {durationLabel}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            {/* Enrolled badge */}
            <span style={{
              background: 'rgba(124,58,237,0.12)',
              color: '#a78bfa',
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 10,
            }}>
              {enrolledCount} student{enrolledCount !== 1 ? 's' : ''}
            </span>
            {tc.pricePerStudent != null && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                {tc.baseCurrency ?? ''} {tc.pricePerStudent}/class
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>{recurrenceSummary(tc)}</span>
          {next && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>Next: {next}</span>
            </>
          )}
        </div>

        {tc.location && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {tc.location}
          </div>
        )}
      </div>

      {/* Chevron */}
      <div style={{ display: 'flex', alignItems: 'center', paddingRight: 12, color: 'var(--text-muted)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </button>
  )
}
