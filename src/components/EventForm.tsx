import { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { DANCE_STYLES } from '../types'
import type { Currency } from '../types'
import { X, Calendar } from 'lucide-react'
import { format } from 'date-fns'

const CURRENCIES: Currency[] = ['CAD', 'USD', 'BRL']

function toDateInput(ts: number | null): string {
  if (!ts) return ''
  return format(new Date(ts), 'yyyy-MM-dd')
}

function fromDateInput(s: string): number | null {
  if (!s) return null
  return new Date(s).getTime()
}

export function EventForm() {
  const isEventFormOpen = useAppStore(s => s.isEventFormOpen)
  const editingEvent = useAppStore(s => s.editingEvent)
  const closeEventForm = useAppStore(s => s.closeEventForm)
  const addEvent = useAppStore(s => s.addEvent)
  const updateEvent = useAppStore(s => s.updateEvent)

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [cost, setCost] = useState('')
  const [currency, setCurrency] = useState<Currency>('CAD')
  const [styles, setStyles] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [addToCalendar, setAddToCalendar] = useState(false)

  useEffect(() => {
    if (isEventFormOpen) {
      if (editingEvent) {
        setName(editingEvent.name)
        setStartDate(toDateInput(editingEvent.startDate))
        setEndDate(toDateInput(editingEvent.endDate))
        setLocation(editingEvent.location ?? '')
        setCost(editingEvent.cost != null ? String(editingEvent.cost) : '')
        setCurrency(editingEvent.baseCurrency ?? 'CAD')
        setStyles(editingEvent.styles)
        setNotes(editingEvent.notes ?? '')
        setAddToCalendar(!!editingEvent.googleCalendarEventId)
      } else {
        setName('')
        setStartDate(toDateInput(Date.now()))
        setEndDate('')
        setLocation('')
        setCost('')
        setCurrency('CAD')
        setStyles([])
        setNotes('')
        setAddToCalendar(false)
      }
    }
  }, [isEventFormOpen, editingEvent])

  if (!isEventFormOpen) return null

  function toggleStyle(s: string) {
    setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function handleSave() {
    if (!name.trim() || !startDate) return
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        startDate: fromDateInput(startDate) ?? Date.now(),
        endDate: fromDateInput(endDate),
        location: location.trim() || null,
        cost: cost ? Number(cost) : null,
        baseCurrency: cost ? currency : null,
        styles,
        notes: notes.trim() || null,
        googleCalendarEventId: editingEvent?.googleCalendarEventId ?? null,
      }
      if (editingEvent) {
        await updateEvent(editingEvent.id, data, addToCalendar)
      } else {
        await addEvent(data, addToCalendar)
      }
      closeEventForm()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeEventForm}
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
            maxHeight: '92dvh',
            display: 'flex', flexDirection: 'column',
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px 0', gap: 12 }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--text-muted)' }} />
            </div>
            <button
              onClick={closeEventForm}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 8, cursor: 'pointer',
                color: 'var(--text-secondary)', display: 'flex',
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: '12px 20px 4px' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {editingEvent ? 'Edit Event' : 'New Event'}
            </h3>
          </div>

          <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 16px' }}>
            {/* Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Event name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Workshop, social, festival…"
                style={inputStyle}
              />
            </div>

            {/* Start date */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Start date *</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* End date */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>End date (optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Location */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Location</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Venue or city"
                style={inputStyle}
              />
            </div>

            {/* Cost */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Cost</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  min={0}
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="0.00"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value as Currency)}
                  style={{ ...inputStyle, width: 80 }}
                >
                  {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dance styles */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Dance styles</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {DANCE_STYLES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStyle(s)}
                    style={{
                      padding: '5px 13px', borderRadius: 20,
                      background: styles.includes(s) ? '#7c3aed' : 'var(--bg-card)',
                      color: styles.includes(s) ? '#fff' : 'var(--text-secondary)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'inherit',
                      border: `1px solid ${styles.includes(s) ? '#7c3aed' : 'var(--border)'}`,

                      transition: 'all 150ms ease',
                    } as React.CSSProperties}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional details…"
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
              />
            </div>

            {/* Google Calendar toggle */}
            <div
              onClick={() => setAddToCalendar(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 12, marginBottom: 16, cursor: 'pointer',
                background: addToCalendar ? 'rgba(124,58,237,0.12)' : 'var(--bg-card)',
                border: `1px solid ${addToCalendar ? '#7c3aed' : 'var(--border)'}`,
                transition: 'all 150ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Calendar size={16} style={{ color: addToCalendar ? '#7c3aed' : 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Add to Google Calendar</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Creates an all-day event</div>
                </div>
              </div>
              <div style={{
                width: 40, height: 22, borderRadius: 11,
                background: addToCalendar ? '#7c3aed' : 'var(--border)',
                position: 'relative', transition: 'background 150ms ease', flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: 3, left: addToCalendar ? 21 : 3,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 150ms ease',
                }} />
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim() || !startDate}
                style={{
                  flex: 1, padding: '13px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: saving || !name.trim() || !startDate ? 'not-allowed' : 'pointer',
                  opacity: saving || !name.trim() || !startDate ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {saving ? 'Saving…' : editingEvent ? 'Save changes' : 'Add event'}
              </button>
              <button
                onClick={closeEventForm}
                style={{
                  padding: '13px 20px', borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-secondary)',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 10, color: 'var(--text-primary)', fontSize: 14,
  fontFamily: 'inherit', outline: 'none',
}
