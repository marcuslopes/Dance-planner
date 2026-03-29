import { format } from 'date-fns'
import type { Workshop } from '../types'

interface Props {
  workshop: Workshop
  enrolledCount: number
  onClick: () => void
}

export function WorkshopCard({ workshop: w, enrolledCount, onClick }: Props) {
  const dateStr = w.endDate
    ? `${format(new Date(w.startDate), 'MMM d')} – ${format(new Date(w.endDate), 'MMM d, yyyy')}`
    : format(new Date(w.startDate), 'EEE, MMM d, yyyy')

  const capacityLabel = w.maxCapacity != null
    ? `${enrolledCount} / ${w.maxCapacity}`
    : `${enrolledCount} enrolled`

  const isPast = (w.endDate ?? w.startDate) < Date.now()

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        background: 'var(--bg-elevated)',
        borderRadius: 14,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        padding: 0,
        opacity: isPast ? 0.65 : 1,
      }}
    >
      {/* Date accent block */}
      <div style={{
        flexShrink: 0,
        width: 56,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 4px',
        background: 'rgba(124,58,237,0.10)',
        borderRight: '1px solid var(--border)',
        minHeight: 64,
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#a78bfa', lineHeight: 1 }}>
          {format(new Date(w.startDate), 'd')}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {format(new Date(w.startDate), 'MMM')}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            {w.title}
          </div>
          <span style={{
            flexShrink: 0,
            fontSize: 11, fontWeight: 700,
            padding: '2px 8px', borderRadius: 10,
            background: 'rgba(124,58,237,0.12)',
            color: '#a78bfa',
          }}>
            {capacityLabel}
          </span>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0 8px' }}>
          <span>{w.style}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{dateStr}</span>
        </div>

        {(w.location || w.ticketPrice != null) && (
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            {w.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {w.location}
              </span>
            )}
            {w.ticketPrice != null && (
              <span>{w.baseCurrency ?? ''} {w.ticketPrice} / ticket</span>
            )}
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
