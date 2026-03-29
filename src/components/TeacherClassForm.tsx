import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/appStore'
import { DANCE_STYLES, CARD_COLORS } from '../types'
import type { RecurrenceFrequency, RecurrenceRule, TeacherClass } from '../types'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function toLocalDateString(epochMs: number) { return format(new Date(epochMs), 'yyyy-MM-dd') }
function toLocalTimeString(epochMs: number) { return format(new Date(epochMs), 'HH:mm') }
function combineDateAndTime(d: string, t: string) { return new Date(`${d}T${t}`).getTime() }
function defaultStart() {
  const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d.getTime()
}

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
  date: string
  startTime: string
  endTime: string
  location: string
  notes: string
  pricePerStudent: string
  currency: string
  color: string
  recurrenceEnabled: boolean
  frequency: RecurrenceFrequency
  daysOfWeek: number[]
  endType: 'none' | 'date' | 'count'
  endDate: string
  count: string
  addToCalendar: boolean
}

function initForm(tc?: TeacherClass | null): FormState {
  if (tc) {
    const r = tc.recurrence
    return {
      title: tc.title,
      style: tc.style,
      date: toLocalDateString(tc.startTime),
      startTime: toLocalTimeString(tc.startTime),
      endTime: toLocalTimeString(tc.endTime),
      location: tc.location ?? '',
      notes: tc.notes ?? '',
      pricePerStudent: tc.pricePerStudent != null ? String(tc.pricePerStudent) : '',
      currency: tc.baseCurrency ?? 'CAD',
      color: tc.color,
      recurrenceEnabled: !!r,
      frequency: r?.frequency ?? 'weekly',
      daysOfWeek: r?.daysOfWeek ?? [],
      endType: r?.endDate ? 'date' : r?.count ? 'count' : 'none',
      endDate: r?.endDate ? toLocalDateString(r.endDate) : '',
      count: r?.count ? String(r.count) : '',
      addToCalendar: true,
    }
  }
  const start = defaultStart()
  const d = new Date(start)
  return {
    title: '', style: DANCE_STYLES[0],
    date: format(d, 'yyyy-MM-dd'),
    startTime: format(d, 'HH:mm'),
    endTime: format(new Date(start + 60 * 60 * 1000), 'HH:mm'),
    location: '', notes: '', pricePerStudent: '', currency: 'CAD',
    color: CARD_COLORS[0],
    recurrenceEnabled: true,
    frequency: 'weekly',
    daysOfWeek: [new Date().getDay()],
    endType: 'none', endDate: '', count: '',
    addToCalendar: true,
  }
}

export function TeacherClassForm() {
  const isOpen = useAppStore(s => s.isTeacherClassFormOpen)
  const editingTeacherClass = useAppStore(s => s.editingTeacherClass)
  const closeTeacherClassForm = useAppStore(s => s.closeTeacherClassForm)
  const addTeacherClass = useAppStore(s => s.addTeacherClass)
  const updateTeacherClass = useAppStore(s => s.updateTeacherClass)
  const deleteTeacherClass = useAppStore(s => s.deleteTeacherClass)
  const archiveTeacherClass = useAppStore(s => s.archiveTeacherClass)

  const [form, setForm] = useState<FormState>(() => initForm(editingTeacherClass))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (isOpen) { setForm(initForm(editingTeacherClass)); setConfirmDelete(false) }
  }, [isOpen, editingTeacherClass])

  if (!isOpen) return null

  const isEditing = !!editingTeacherClass

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleDay(day: number) {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter(d => d !== day)
        : [...f.daysOfWeek, day].sort(),
    }))
  }

  function buildRecurrence(): RecurrenceRule | null {
    if (!form.recurrenceEnabled) return null
    return {
      frequency: form.frequency,
      daysOfWeek: form.frequency === 'monthly' ? [] : form.daysOfWeek,
      endDate: form.endType === 'date' && form.endDate ? new Date(form.endDate).getTime() : null,
      count: form.endType === 'count' && form.count ? Number(form.count) : null,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!form.date || !form.startTime || !form.endTime) { toast.error('Date and time are required'); return }
    const startTime = combineDateAndTime(form.date, form.startTime)
    const endTime = combineDateAndTime(form.date, form.endTime)
    if (endTime <= startTime) { toast.error('End time must be after start time'); return }

    setSaving(true)
    try {
      const data = {
        title: form.title.trim(),
        style: form.style,
        startTime, endTime,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
        pricePerStudent: form.pricePerStudent ? Number(form.pricePerStudent) : null,
        baseCurrency: form.pricePerStudent ? form.currency as TeacherClass['baseCurrency'] : null,
        color: form.color,
        recurrence: buildRecurrence(),
        googleCalendarEventId: editingTeacherClass?.googleCalendarEventId ?? null,
      }
      if (isEditing && editingTeacherClass) {
        await updateTeacherClass(editingTeacherClass.id, data, form.addToCalendar)
        toast.success('Class updated')
      } else {
        await addTeacherClass(data, form.addToCalendar)
        toast.success('Class added')
      }
      closeTeacherClassForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editingTeacherClass) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setSaving(true)
    try {
      await deleteTeacherClass(editingTeacherClass.id)
      toast.success('Class deleted')
      closeTeacherClassForm()
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
        <button onClick={closeTeacherClassForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
          {isEditing ? 'Edit Class' : 'New Class'}
        </h2>
        {isEditing ? (
          <button
            onClick={() => { archiveTeacherClass(editingTeacherClass!.id); closeTeacherClassForm() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, fontSize: 12, fontWeight: 600 }}
          >
            Archive
          </button>
        ) : <div style={{ width: 52 }} />}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Title */}
        <div>
          <label style={labelStyle}>Class title *</label>
          <input style={inputStyle} placeholder="e.g. Wednesday Zouk" value={form.title}
            onChange={e => setField('title', e.target.value)} />
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
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <label style={labelStyle}>Color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CARD_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setField('color', c)}
                style={{
                  width: 28, height: 28, borderRadius: '50%', border: '3px solid',
                  borderColor: form.color === c ? '#fff' : 'transparent',
                  background: c, cursor: 'pointer',
                  outline: form.color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: 2,
                }} />
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <label style={labelStyle}>First session date *</label>
          <input type="date" style={inputStyle} value={form.date}
            onChange={e => setField('date', e.target.value)} required />
        </div>

        {/* Start / End time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Start time *</label>
            <input type="time" style={inputStyle} value={form.startTime}
              onChange={e => setField('startTime', e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>End time *</label>
            <input type="time" style={inputStyle} value={form.endTime}
              onChange={e => setField('endTime', e.target.value)} required />
          </div>
        </div>

        {/* Location */}
        <div>
          <label style={labelStyle}>Location (optional)</label>
          <input style={inputStyle} placeholder="Studio name or address" value={form.location}
            onChange={e => setField('location', e.target.value)} />
        </div>

        {/* Price */}
        <div>
          <label style={labelStyle}>Price per student / class (optional)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              style={{ ...inputStyle, width: 80, flexShrink: 0, appearance: 'none' }}
              value={form.currency}
              onChange={e => setField('currency', e.target.value)}
            >
              {['CAD', 'USD', 'BRL'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" min={0} step="0.01" style={inputStyle}
              placeholder="0.00" value={form.pricePerStudent}
              onChange={e => setField('pricePerStudent', e.target.value)} />
          </div>
        </div>

        {/* Recurrence */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Recurrence</span>
            <button type="button" onClick={() => setField('recurrenceEnabled', !form.recurrenceEnabled)}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: form.recurrenceEnabled ? '#7c3aed' : 'var(--border)',
                border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              }}>
              <span style={{
                position: 'absolute', top: 3, left: form.recurrenceEnabled ? 21 : 3,
                width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
              }} />
            </button>
          </div>

          {form.recurrenceEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14, background: 'rgba(124,58,237,0.06)', borderRadius: 12, border: '1px solid rgba(124,58,237,0.15)' }}>
              <div>
                <label style={{ ...labelStyle, marginBottom: 8 }}>Frequency</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['weekly', 'biweekly', 'monthly'] as RecurrenceFrequency[]).map(f => (
                    <button key={f} type="button" onClick={() => setField('frequency', f)}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 8, border: '1.5px solid',
                        borderColor: form.frequency === f ? '#7c3aed' : 'var(--border)',
                        background: form.frequency === f ? 'rgba(124,58,237,0.15)' : 'transparent',
                        color: form.frequency === f ? '#a78bfa' : 'var(--text-muted)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                      }}>
                      {f === 'biweekly' ? 'Bi-weekly' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {form.frequency !== 'monthly' && (
                <div>
                  <label style={{ ...labelStyle, marginBottom: 8 }}>Days</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {DAY_LABELS.map((label, idx) => (
                      <button key={idx} type="button" onClick={() => toggleDay(idx)}
                        style={{
                          flex: 1, padding: '7px 2px', borderRadius: 8, border: '1.5px solid',
                          borderColor: form.daysOfWeek.includes(idx) ? '#7c3aed' : 'var(--border)',
                          background: form.daysOfWeek.includes(idx) ? 'rgba(124,58,237,0.15)' : 'transparent',
                          color: form.daysOfWeek.includes(idx) ? '#a78bfa' : 'var(--text-muted)',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ ...labelStyle, marginBottom: 8 }}>Ends</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(['none', 'date', 'count'] as const).map(type => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <input type="radio" name="tc-endType" checked={form.endType === type}
                        onChange={() => setForm(f => ({ ...f, endType: type }))}
                        style={{ accentColor: '#7c3aed', width: 16, height: 16 }} />
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {type === 'none' ? 'No end date' : type === 'date' ? 'On date' : 'After N sessions'}
                      </span>
                      {type === 'date' && form.endType === 'date' && (
                        <input type="date" style={{ ...inputStyle, flex: 1, padding: '6px 10px', fontSize: 13 }}
                          value={form.endDate} onChange={e => setField('endDate', e.target.value)} />
                      )}
                      {type === 'count' && form.endType === 'count' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button type="button" onClick={() => setField('count', String(Math.max(1, Number(form.count || 1) - 1)))}
                            style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ minWidth: 24, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{form.count || 1}</span>
                          <button type="button" onClick={() => setField('count', String(Number(form.count || 1) + 1))}
                            style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle}>Notes (optional)</label>
          <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
            placeholder="Any notes about this class..." value={form.notes}
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
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Creates an event in your calendar</div>
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
            {confirmDelete ? 'Tap again to confirm delete' : 'Delete class'}
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
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add class'}
        </button>
      </div>
    </div>
  )
}
