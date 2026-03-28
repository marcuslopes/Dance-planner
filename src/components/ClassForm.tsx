import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/appStore'
import type { RecurrenceFrequency, RecurrenceRule, ScheduledClass } from '../types'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function toLocalDateString(epochMs: number): string {
  return format(new Date(epochMs), 'yyyy-MM-dd')
}

function toLocalTimeString(epochMs: number): string {
  return format(new Date(epochMs), 'HH:mm')
}

function combineDateAndTime(dateStr: string, timeStr: string): number {
  return new Date(`${dateStr}T${timeStr}`).getTime()
}

function defaultStart(): number {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d.getTime()
}

function defaultEnd(start: number): number {
  return start + 60 * 60 * 1000
}

interface FormState {
  title: string
  packageId: string
  date: string
  startTime: string
  endTime: string
  location: string
  notes: string
  recurrenceEnabled: boolean
  frequency: RecurrenceFrequency
  daysOfWeek: number[]
  endType: 'none' | 'date' | 'count'
  endDate: string
  count: string
  addToCalendar: boolean
}

function initFormState(cls?: ScheduledClass | null): FormState {
  if (cls) {
    const rule = cls.recurrence
    return {
      title: cls.title,
      packageId: cls.packageId ?? '',
      date: toLocalDateString(cls.startTime),
      startTime: toLocalTimeString(cls.startTime),
      endTime: toLocalTimeString(cls.endTime),
      location: cls.location ?? '',
      notes: cls.notes ?? '',
      recurrenceEnabled: !!rule,
      frequency: rule?.frequency ?? 'weekly',
      daysOfWeek: rule?.daysOfWeek ?? [],
      endType: rule?.endDate ? 'date' : rule?.count ? 'count' : 'none',
      endDate: rule?.endDate ? toLocalDateString(rule.endDate) : '',
      count: rule?.count ? String(rule.count) : '',
      addToCalendar: true,
    }
  }
  const start = defaultStart()
  const d = new Date(start)
  return {
    title: '',
    packageId: '',
    date: format(d, 'yyyy-MM-dd'),
    startTime: format(d, 'HH:mm'),
    endTime: format(new Date(defaultEnd(start)), 'HH:mm'),
    location: '',
    notes: '',
    recurrenceEnabled: false,
    frequency: 'weekly',
    daysOfWeek: [new Date().getDay()],
    endType: 'none',
    endDate: '',
    count: '',
    addToCalendar: true,
  }
}

// ── Reusable input style ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1.5px solid var(--border)',
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 6,
  display: 'block',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ClassForm() {
  const isOpen = useAppStore(s => s.isClassFormOpen)
  const editingClass = useAppStore(s => s.editingClass)
  const packages = useAppStore(s => s.packages)
  const closeClassForm = useAppStore(s => s.closeClassForm)
  const addScheduledClass = useAppStore(s => s.addScheduledClass)
  const updateScheduledClass = useAppStore(s => s.updateScheduledClass)
  const deleteScheduledClass = useAppStore(s => s.deleteScheduledClass)

  const [form, setForm] = useState<FormState>(() => initFormState(editingClass))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm(initFormState(editingClass))
      setConfirmDelete(false)
    }
  }, [isOpen, editingClass])

  if (!isOpen) return null

  const isEditing = !!editingClass
  const selectedPkg = form.packageId
    ? packages.find(p => p.id === form.packageId) ?? null
    : null

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
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
      daysOfWeek: (form.frequency === 'monthly') ? [] : form.daysOfWeek,
      endDate: form.endType === 'date' && form.endDate ? new Date(form.endDate).getTime() : null,
      count: form.endType === 'count' && form.count ? Number(form.count) : null,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.packageId && !form.title.trim()) { toast.error('Title is required for classes without a package'); return }
    if (!form.date || !form.startTime || !form.endTime) { toast.error('Date and time are required'); return }

    const startTime = combineDateAndTime(form.date, form.startTime)
    const endTime = combineDateAndTime(form.date, form.endTime)
    if (endTime <= startTime) { toast.error('End time must be after start time'); return }

    const effectiveTitle = form.title.trim() || (selectedPkg?.label ?? '')

    setSaving(true)
    try {
      const data: Omit<ScheduledClass, 'id' | 'createdAt' | 'updatedAt' | 'googleCalendarEventId'> = {
        title: effectiveTitle,
        packageId: form.packageId || null,
        startTime,
        endTime,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
        recurrence: buildRecurrence(),
      }

      if (isEditing && editingClass) {
        await updateScheduledClass(editingClass.id, data, form.addToCalendar)
        toast.success('Class updated')
      } else {
        await addScheduledClass(data, form.addToCalendar)
        toast.success('Class scheduled')
      }
      closeClassForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editingClass) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setSaving(true)
    try {
      await deleteScheduledClass(editingClass.id)
      toast.success('Class deleted')
      closeClassForm()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setSaving(false)
    }
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
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <button onClick={closeClassForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
          {isEditing ? 'Edit Class' : 'Plan a Class'}
        </h2>
        <div style={{ width: 30 }} />
      </div>

      {/* Scrollable form */}
      <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Link to package */}
        <div>
          <label style={labelStyle}>Link to package (optional)</label>
          <select
            style={{ ...inputStyle, appearance: 'none' }}
            value={form.packageId}
            onChange={e => {
              const newPkgId = e.target.value
              setForm(prev => {
                const newPkg = newPkgId ? packages.find(p => p.id === newPkgId) : null
                const previousPkg = prev.packageId ? packages.find(p => p.id === prev.packageId) : null
                const titleIsPristine =
                  !prev.title.trim() ||
                  (previousPkg != null && prev.title.trim() === previousPkg.label)
                return {
                  ...prev,
                  packageId: newPkgId,
                  title: titleIsPristine ? (newPkg?.label ?? '') : prev.title,
                }
              })
            }}
          >
            <option value="">— No package —</option>
            {packages.filter(p => !p.archivedAt).map(p => (
              <option key={p.id} value={p.id}>{p.instructorName} · {p.label}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label style={labelStyle}>
            Class title{selectedPkg ? ' (optional)' : ' *'}
          </label>
          <input
            style={inputStyle}
            placeholder={selectedPkg ? `Defaults to "${selectedPkg.label}"` : 'e.g. Zouk with Ana'}
            value={form.title}
            onChange={e => set('title', e.target.value)}
          />
        </div>

        {/* Date */}
        <div>
          <label style={labelStyle}>Date *</label>
          <input
            type="date"
            style={inputStyle}
            value={form.date}
            onChange={e => set('date', e.target.value)}
            required
          />
        </div>

        {/* Start / End time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Start time *</label>
            <input
              type="time"
              style={inputStyle}
              value={form.startTime}
              onChange={e => set('startTime', e.target.value)}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>End time *</label>
            <input
              type="time"
              style={inputStyle}
              value={form.endTime}
              onChange={e => set('endTime', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label style={labelStyle}>Location (optional)</label>
          <input
            style={inputStyle}
            placeholder="Studio address or name"
            value={form.location}
            onChange={e => set('location', e.target.value)}
          />
        </div>

        {/* Recurrence */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Recurrence</span>
            <button
              type="button"
              onClick={() => set('recurrenceEnabled', !form.recurrenceEnabled)}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: form.recurrenceEnabled ? '#7c3aed' : 'var(--border)',
                border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: form.recurrenceEnabled ? 21 : 3,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

          {form.recurrenceEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px', background: 'rgba(124,58,237,0.06)', borderRadius: 12, border: '1px solid rgba(124,58,237,0.15)' }}>
              {/* Frequency */}
              <div>
                <label style={{ ...labelStyle, marginBottom: 8 }}>Frequency</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['weekly', 'biweekly', 'monthly'] as RecurrenceFrequency[]).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => set('frequency', f)}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 8, border: '1.5px solid',
                        borderColor: form.frequency === f ? '#7c3aed' : 'var(--border)',
                        background: form.frequency === f ? 'rgba(124,58,237,0.15)' : 'transparent',
                        color: form.frequency === f ? '#a78bfa' : 'var(--text-muted)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {f === 'biweekly' ? 'Bi-weekly' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day-of-week picker */}
              {form.frequency !== 'monthly' && (
                <div>
                  <label style={{ ...labelStyle, marginBottom: 8 }}>Days</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {DAY_LABELS.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        style={{
                          flex: 1, padding: '7px 2px', borderRadius: 8, border: '1.5px solid',
                          borderColor: form.daysOfWeek.includes(idx) ? '#7c3aed' : 'var(--border)',
                          background: form.daysOfWeek.includes(idx) ? 'rgba(124,58,237,0.15)' : 'transparent',
                          color: form.daysOfWeek.includes(idx) ? '#a78bfa' : 'var(--text-muted)',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* End condition */}
              <div>
                <label style={{ ...labelStyle, marginBottom: 8 }}>Ends</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(['none', 'date', 'count'] as const).map(type => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="endType"
                        checked={form.endType === type}
                        onChange={() => set('endType', type)}
                        style={{ accentColor: '#7c3aed', width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {type === 'none' ? 'No end date' : type === 'date' ? 'On date' : 'After N classes'}
                      </span>
                      {type === 'date' && form.endType === 'date' && (
                        <input
                          type="date"
                          style={{ ...inputStyle, flex: 1, padding: '6px 10px', fontSize: 13 }}
                          value={form.endDate}
                          onChange={e => set('endDate', e.target.value)}
                        />
                      )}
                      {type === 'count' && form.endType === 'count' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button type="button" onClick={() => set('count', String(Math.max(1, Number(form.count || 1) - 1)))}
                            style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ minWidth: 24, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{form.count || 1}</span>
                          <button type="button" onClick={() => set('count', String(Number(form.count || 1) + 1))}
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
          <textarea
            style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
            placeholder="Any notes about this class..."
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />
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
          <button
            type="button"
            onClick={() => set('addToCalendar', !form.addToCalendar)}
            style={{
              width: 44, height: 24, borderRadius: 12, flexShrink: 0,
              background: form.addToCalendar ? '#7c3aed' : 'var(--border)',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 4, left: form.addToCalendar ? 23 : 4,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>

        {/* Delete button (edit mode) */}
        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            style={{
              padding: '12px', borderRadius: 12, border: '1.5px solid',
              borderColor: confirmDelete ? '#f43f5e' : 'var(--border)',
              background: confirmDelete ? 'rgba(244,63,94,0.1)' : 'transparent',
              color: confirmDelete ? '#f43f5e' : 'var(--text-muted)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {confirmDelete ? 'Tap again to confirm delete' : 'Delete class'}
          </button>
        )}

        {/* Bottom padding */}
        <div style={{ height: 20 }} />
      </form>

      {/* Save button */}
      <div style={{ padding: '12px 20px 20px', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
        <button
          type="submit"
          form="class-form"
          onClick={handleSubmit}
          disabled={saving}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: '#7c3aed', color: '#fff',
            fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Schedule class'}
        </button>
      </div>
    </div>
  )
}
