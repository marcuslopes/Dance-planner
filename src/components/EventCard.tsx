import { CalendarDays } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { formatCurrency } from '../lib/currency'
import type { DanceEvent } from '../types'

interface Props {
  event: DanceEvent
  onClick: () => void
}

function formatDateRange(startDate: number, endDate: number | null): string {
  const start = new Date(startDate)
  if (!endDate) return format(start, 'MMM d, yyyy')
  const end = new Date(endDate)
  if (isSameDay(start, end)) return format(start, 'MMM d, yyyy')
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${format(start, 'MMM d')}–${format(end, 'd, yyyy')}`
  }
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
}

export function EventCard({ event, onClick }: Props) {
  const isPast = event.startDate < Date.now()

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        cursor: 'pointer',
        transition: 'border-color 150ms ease',
        opacity: isPast ? 0.85 : 1,
      }}
    >
      {/* Icon area */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'rgba(124,58,237,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <CalendarDays size={22} style={{ color: '#7c3aed' }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: event.location || event.cost != null || event.styles.length > 0 ? 6 : 0 }}>
          {formatDateRange(event.startDate, event.endDate)}
        </div>

        {event.location && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.location}
          </div>
        )}

        {event.cost != null && event.baseCurrency && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            {formatCurrency(event.cost, event.baseCurrency)}
          </div>
        )}

        {event.styles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
            {event.styles.map(s => (
              <span key={s} style={{
                background: 'rgba(124,58,237,0.12)', color: '#a78bfa',
                borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
              }}>
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
