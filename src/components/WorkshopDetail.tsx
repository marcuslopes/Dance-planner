import { format } from 'date-fns'
import { useAppStore } from '../store/appStore'
import type { Inscription } from '../types'

const PAYMENT_COLOR: Record<Inscription['paymentStatus'], string> = {
  paid: '#10b981', partial: '#f59e0b', unpaid: '#f43f5e',
}

interface Props {
  workshopId: string
  onClose: () => void
}

export function WorkshopDetail({ workshopId, onClose }: Props) {
  const w = useAppStore(s => s.workshops.find(wk => wk.id === workshopId))
  const inscriptions = useAppStore(s => s.inscriptions.filter(i => i.workshopId === workshopId))
  const openWorkshopForm = useAppStore(s => s.openWorkshopForm)
  const openInscriptionForm = useAppStore(s => s.openInscriptionForm)

  if (!w) return null

  const dateStr = w.endDate
    ? `${format(new Date(w.startDate), 'EEE, MMM d')} – ${format(new Date(w.endDate), 'EEE, MMM d, yyyy')}`
    : format(new Date(w.startDate), 'EEE, MMM d, yyyy')

  const paidCount = inscriptions.filter(i => i.paymentStatus === 'paid').length
  const partialCount = inscriptions.filter(i => i.paymentStatus === 'partial').length
  const unpaidCount = inscriptions.filter(i => i.paymentStatus === 'unpaid').length
  const totalRevenue = inscriptions.reduce((sum, i) => sum + (i.amountPaid ?? 0), 0)

  const isFull = w.maxCapacity != null && inscriptions.length >= w.maxCapacity

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
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{w.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{w.style}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => openWorkshopForm(w)}
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
              {dateStr}
            </div>
            {w.location && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {w.location}
              </div>
            )}
            {w.ticketPrice != null && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {w.baseCurrency} {w.ticketPrice} / ticket
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <StatBlock label="Enrolled" value={`${inscriptions.length}${w.maxCapacity ? ` / ${w.maxCapacity}` : ''}`} color={isFull ? '#f59e0b' : undefined} />
            <StatBlock label="Paid" value={String(paidCount)} color="#10b981" />
            {partialCount > 0 && <StatBlock label="Partial" value={String(partialCount)} color="#f59e0b" />}
            <StatBlock label="Unpaid" value={String(unpaidCount)} color={unpaidCount > 0 ? '#f43f5e' : undefined} />
            {totalRevenue > 0 && (
              <StatBlock label="Revenue" value={`${w.baseCurrency ?? ''} ${totalRevenue.toFixed(0)}`} />
            )}
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
                  onClick={() => openInscriptionForm(workshopId, 'workshop', ins)}
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
        {!isFull && (
          <div style={{ padding: '12px 16px 20px', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => openInscriptionForm(workshopId, 'workshop')}
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
        )}
        {isFull && (
          <div style={{ padding: '12px 16px 20px', borderTop: '1px solid var(--border)', textAlign: 'center', color: '#f59e0b', fontSize: 13, fontWeight: 600 }}>
            Workshop is full ({w.maxCapacity} / {w.maxCapacity})
          </div>
        )}
      </div>
    </div>
  )
}

function StatBlock({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ flex: 1, padding: '8px 6px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)', textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: color ?? 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{label}</div>
    </div>
  )
}
