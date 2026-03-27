import { format } from 'date-fns'
import type { ScheduledClass, Package } from '../types'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FREQ_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
}

interface Props {
  cls: ScheduledClass
  pkg?: Package
  onClick: () => void
}

export function ClassEventCard({ cls, pkg, onClick }: Props) {
  const accentColor = pkg?.color ?? '#7c3aed'
  const start = new Date(cls.startTime)
  const end = new Date(cls.endTime)
  const timeRange = `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`

  const recurrenceBadge = cls.recurrence
    ? [
        FREQ_LABELS[cls.recurrence.frequency],
        cls.recurrence.daysOfWeek.length > 0
          ? cls.recurrence.daysOfWeek.map(d => DAY_NAMES[d]).join(', ')
          : null,
      ].filter(Boolean).join(' · ')
    : null

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'opacity 0.15s',
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cls.title}
        </span>
        {cls.googleCalendarEventId && (
          <span title="Synced to Google Calendar" style={{ color: '#4285F4', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
          </span>
        )}
      </div>

      {/* Package label */}
      {pkg && (
        <span style={{ fontSize: 12, color: accentColor, fontWeight: 600 }}>
          {pkg.instructorName} · {pkg.label}
        </span>
      )}

      {/* Time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 12 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        {timeRange}
      </div>

      {/* Location */}
      {cls.location && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 12 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          {cls.location}
        </div>
      )}

      {/* Recurrence badge */}
      {recurrenceBadge && (
        <div style={{ marginTop: 2 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600,
            background: 'rgba(124,58,237,0.12)', color: '#a78bfa',
            borderRadius: 6, padding: '2px 7px',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            {recurrenceBadge}
          </span>
        </div>
      )}
    </button>
  )
}
