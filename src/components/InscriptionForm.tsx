import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/appStore'
import type { Inscription, InscriptionPaymentStatus } from '../types'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1.5px solid var(--border)', background: 'var(--bg-elevated)',
  color: 'var(--text-primary)', fontSize: 15, outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block',
}

const STATUSES: { id: InscriptionPaymentStatus; label: string; color: string }[] = [
  { id: 'unpaid', label: 'Unpaid', color: '#f43f5e' },
  { id: 'partial', label: 'Partial', color: '#f59e0b' },
  { id: 'paid', label: 'Paid', color: '#10b981' },
]

interface FormState {
  studentName: string
  contactInfo: string
  paymentStatus: InscriptionPaymentStatus
  amountPaid: string
  currency: string
  notes: string
}

function initForm(ins?: Inscription | null): FormState {
  if (ins) return {
    studentName: ins.studentName,
    contactInfo: ins.contactInfo ?? '',
    paymentStatus: ins.paymentStatus,
    amountPaid: ins.amountPaid != null ? String(ins.amountPaid) : '',
    currency: ins.baseCurrency ?? 'CAD',
    notes: ins.notes ?? '',
  }
  return {
    studentName: '', contactInfo: '', paymentStatus: 'unpaid',
    amountPaid: '', currency: 'CAD', notes: '',
  }
}

export function InscriptionForm() {
  const isOpen = useAppStore(s => s.isInscriptionFormOpen)
  const editingInscription = useAppStore(s => s.editingInscription)
  const inscriptionTargetId = useAppStore(s => s.inscriptionTargetId)
  const inscriptionTargetType = useAppStore(s => s.inscriptionTargetType)
  const closeInscriptionForm = useAppStore(s => s.closeInscriptionForm)
  const addInscription = useAppStore(s => s.addInscription)
  const updateInscription = useAppStore(s => s.updateInscription)
  const deleteInscription = useAppStore(s => s.deleteInscription)
  const teacherClasses = useAppStore(s => s.teacherClasses)
  const workshops = useAppStore(s => s.workshops)

  const [form, setForm] = useState<FormState>(() => initForm(editingInscription))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (isOpen) { setForm(initForm(editingInscription)); setConfirmDelete(false) }
  }, [isOpen, editingInscription])

  if (!isOpen) return null

  const isEditing = !!editingInscription

  // Context label
  const contextLabel = inscriptionTargetType === 'class'
    ? teacherClasses.find(c => c.id === inscriptionTargetId)?.title
    : workshops.find(w => w.id === inscriptionTargetId)?.title

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.studentName.trim()) { toast.error('Student name is required'); return }
    if (!inscriptionTargetId || !inscriptionTargetType) { toast.error('No class or workshop selected'); return }

    setSaving(true)
    try {
      const data = {
        teacherClassId: inscriptionTargetType === 'class' ? inscriptionTargetId : null,
        workshopId: inscriptionTargetType === 'workshop' ? inscriptionTargetId : null,
        studentName: form.studentName.trim(),
        contactInfo: form.contactInfo.trim() || null,
        paymentStatus: form.paymentStatus,
        amountPaid: form.amountPaid ? Number(form.amountPaid) : null,
        baseCurrency: form.amountPaid ? form.currency as Inscription['baseCurrency'] : null,
        notes: form.notes.trim() || null,
      }
      if (isEditing && editingInscription) {
        await updateInscription(editingInscription.id, data)
        toast.success('Student updated')
      } else {
        await addInscription(data)
        toast.success('Student added')
      }
      closeInscriptionForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!editingInscription) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setSaving(true)
    try {
      await deleteInscription(editingInscription.id)
      toast.success('Student removed')
      closeInscriptionForm()
    } catch { toast.error('Failed to delete') } finally { setSaving(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end',
    }} onClick={e => { if (e.target === e.currentTarget) closeInscriptionForm() }}>
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
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
              {isEditing ? 'Edit Student' : 'Add Student'}
            </div>
            {contextLabel && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{contextLabel}</div>
            )}
          </div>
          <button onClick={closeInscriptionForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Student name */}
          <div>
            <label style={labelStyle}>Student name *</label>
            <input style={inputStyle} placeholder="Full name" value={form.studentName}
              onChange={e => setField('studentName', e.target.value)} autoFocus />
          </div>

          {/* Contact */}
          <div>
            <label style={labelStyle}>Contact info (optional)</label>
            <input style={inputStyle} placeholder="Phone or email"
              value={form.contactInfo} onChange={e => setField('contactInfo', e.target.value)} />
          </div>

          {/* Payment status */}
          <div>
            <label style={labelStyle}>Payment status</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {STATUSES.map(s => (
                <button key={s.id} type="button" onClick={() => setField('paymentStatus', s.id)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 10, border: '1.5px solid',
                    borderColor: form.paymentStatus === s.id ? s.color : 'var(--border)',
                    background: form.paymentStatus === s.id ? `${s.color}22` : 'transparent',
                    color: form.paymentStatus === s.id ? s.color : 'var(--text-muted)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount paid (shown when partial or paid) */}
          {(form.paymentStatus === 'partial' || form.paymentStatus === 'paid') && (
            <div>
              <label style={labelStyle}>Amount paid (optional)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ ...inputStyle, width: 80, flexShrink: 0, appearance: 'none' }}
                  value={form.currency} onChange={e => setField('currency', e.target.value)}>
                  {['CAD', 'USD', 'BRL'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" min={0} step="0.01" style={inputStyle}
                  placeholder="0.00" value={form.amountPaid}
                  onChange={e => setField('amountPaid', e.target.value)} />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
              placeholder="Any notes about this student..." value={form.notes}
              onChange={e => setField('notes', e.target.value)} />
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
              {confirmDelete ? 'Tap again to confirm remove' : 'Remove student'}
            </button>
          )}
          <div style={{ height: 8 }} />
        </form>

        {/* Save */}
        <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--border)' }}>
          <button type="submit" onClick={handleSubmit} disabled={saving}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: '#7c3aed', color: '#fff',
              fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add student'}
          </button>
        </div>
      </div>
    </div>
  )
}
