import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/appStore'
import { DANCE_STYLES } from '../types'
import type { Workshop } from '../types'

function toDateStr(ms: number) { return format(new Date(ms), 'yyyy-MM-dd') }
function dateToMs(s: string) { return new Date(s).getTime() }

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1.5px solid var(--border)', background: 'var(--bg-elevated)',
  color: 'var(--text-primary)', fontSize: 15, outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block',
}

interface FormState {
  title: string
  style: string
  startDate: string
  endDate: string
  location: string
  ticketPrice: string
  currency: string
  maxCapacity: string
  notes: string
  addToCalendar: boolean
}

function initForm(w?: Workshop | null): FormState {
  if (w) return {
    title: w.title, style: w.style,
    startDate: toDateStr(w.startDate),
    endDate: w.endDate ? toDateStr(w.endDate) : '',
    location: w.location ?? '', ticketPrice: w.ticketPrice != null ? String(w.ticketPrice) : '',
    currency: w.baseCurrency ?? 'CAD', maxCapacity: w.maxCapacity != null ? String(w.maxCapacity) : '',
    notes: w.notes ?? '', addToCalendar: true,
  }
  const d = format(new Date(), 'yyyy-MM-dd')
  return {
    title: '', style: DANCE_STYLES[0], startDate: d, endDate: '', location: '',
    ticketPrice: '', currency: 'CAD', maxCapacity: '', notes: '', addToCalendar: true,
  }
}

export function WorkshopForm() {
  const isOpen = useAppStore(s => s.isWorkshopFormOpen)
  const editingWorkshop = useAppStore(s => s.editingWorkshop)
  const closeWorkshopForm = useAppStore(s => s.closeWorkshopForm)
  const addWorkshop = useAppStore(s => s.addWorkshop)
  const updateWorkshop = useAppStore(s => s.updateWorkshop)
  const deleteWorkshop = useAppStore(s => s.deleteWorkshop)

  const [form, setForm] = useState<FormState>(() => initForm(editingWorkshop))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (isOpen) { setForm(initForm(editingWorkshop)); setConfirmDelete(false) }
  }, [isOpen, editingWorkshop])

  if (!isOpen) return null
  const isEditing = !!editingWorkshop

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!form.startDate) { toast.error('Start date is required'); return }

    setSaving(true)
    try {
      const data = {
        title: form.title.trim(), style: form.style,
        startDate: dateToMs(form.startDate),
        endDate: form.endDate ? dateToMs(form.endDate) : null,
        location: form.location.trim() || null,
        ticketPrice: form.ticketPrice ? Number(form.ticketPrice) : null,
        baseCurrency: form.ticketPrice ? form.currency as Workshop['baseCurrency'] : null,
        maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : null,
        notes: form.notes.trim() || null,
        googleCalendarEventId: editingWorkshop?.googleCalendarEventId ?? null,
      }
      if (isEditing && editingWorkshop) {
        await updateWorkshop(editingWorkshop.id, data, form.addToCalendar)
        toast.success('Workshop updated')
      } else {
        await addWorkshop(data, form.addToCalendar)
        toast.success('Workshop added')
      }
      closeWorkshopForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!editingWorkshop) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setSaving(true)
    try {
      await deleteWorkshop(editingWorkshop.id)
      toast.success('Workshop deleted')
      closeWorkshopForm()
    } catch { toast.error('Failed to delete') } finally { setSaving(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column',
      maxWidth: 430, margin: '0 auto',
      animation: 'slideUp 0.25s ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <button onClick={closeWorkshopForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
          {isEditing ? 'Edit Workshop' : 'New Workshop'}
        </h2>
        <div style={{ width: 30 }} />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Title */}
        <div>
          <label style={labelStyle}>Workshop title *</label>
          <input style={inputStyle} placeholder="e.g. Zouk Intensive Weekend"
            value={form.title} onChange={e => setField('title', e.target.value)} />
        </div>

        {/* Dance style */}
        <div>
          <label style={labelStyle}>Dance style</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {DANCE_STYLES.map(s => (
              <button key={s} type="button" onClick={() => setField('style', s)}
                style={{
                  padding: '5px 12px', borderRadius: 20, border: '1.5px solid',
                  borderColor: form.style === s ? '#7c3aed' : 'var(--border)',
                  background: form.style === s ? 'rgba(124,58,237,0.12)' : 'transparent',
                  color: form.style === s ? '#a78bfa' : 'var(--text-muted)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Start date *</label>
            <input type="date" style={inputStyle} value={form.startDate}
              onChange={e => setField('startDate', e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>End date (optional)</label>
            <input type="date" style={inputStyle} value={form.endDate}
              onChange={e => setField('endDate', e.target.value)} />
          </div>
        </div>

        {/* Location */}
        <div>
          <label style={labelStyle}>Location (optional)</label>
          <input style={inputStyle} placeholder="Venue name or address"
            value={form.location} onChange={e => setField('location', e.target.value)} />
        </div>

        {/* Ticket price */}
        <div>
          <label style={labelStyle}>Ticket price (optional)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ ...inputStyle, width: 80, flexShrink: 0, appearance: 'none' }}
              value={form.currency} onChange={e => setField('currency', e.target.value)}>
              {['CAD', 'USD', 'BRL'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" min={0} step="0.01" style={inputStyle}
              placeholder="0.00" value={form.ticketPrice}
              onChange={e => setField('ticketPrice', e.target.value)} />
          </div>
        </div>

        {/* Capacity */}
        <div>
          <label style={labelStyle}>Max capacity (optional)</label>
          <input type="number" min={1} style={inputStyle} placeholder="e.g. 20"
            value={form.maxCapacity} onChange={e => setField('maxCapacity', e.target.value)} />
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle}>Notes (optional)</label>
          <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
            placeholder="Description, requirements, links..." value={form.notes}
            onChange={e => setField('notes', e.target.value)} />
        </div>

        {/* Add to Google Calendar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#4285F4">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Add to Google Calendar</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Creates an all-day event</div>
            </div>
          </div>
          <button type="button" onClick={() => setField('addToCalendar', !form.addToCalendar)}
            style={{
              width: 44, height: 24, borderRadius: 12, flexShrink: 0,
              background: form.addToCalendar ? '#7c3aed' : 'var(--border)',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            }}>
            <span style={{
              position: 'absolute', top: 4, left: form.addToCalendar ? 23 : 4,
              width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
            }} />
          </button>
        </div>

        {/* Delete */}
        {isEditing && (
          <button type="button" onClick={handleDelete} disabled={saving}
            style={{
              padding: '12px', borderRadius: 12, border: '1.5px solid',
              borderColor: confirmDelete ? '#f43f5e' : 'var(--border)',
              background: confirmDelete ? 'rgba(244,63,94,0.1)' : 'transparent',
              color: confirmDelete ? '#f43f5e' : 'var(--text-muted)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
            {confirmDelete ? 'Tap again to confirm delete' : 'Delete workshop'}
          </button>
        )}
        <div style={{ height: 20 }} />
      </form>

      {/* Save button */}
      <div style={{ padding: '12px 20px 20px', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
        <button type="submit" onClick={handleSubmit} disabled={saving}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: '#7c3aed', color: '#fff',
            fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}>
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add workshop'}
        </button>
      </div>
    </div>
  )
}
