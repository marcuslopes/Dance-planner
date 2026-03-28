import { useState, useEffect } from 'react'
import { useAppStore, getUniqueTeachers } from '../store/appStore'
import { CARD_COLORS, DANCE_STYLES, type Currency } from '../types'
import toast from 'react-hot-toast'

export function PackageForm() {
  const { isFormOpen, editingPackage, prefilledInstructor, closeForm, addPackage, updatePackage, packages } = useAppStore()
  const existingTeachers = getUniqueTeachers(packages)

  const [instructorName, setInstructorName] = useState('')
  const [label, setLabel] = useState('')
  const [totalClasses, setTotalClasses] = useState(10)
  const [priceAmount, setPriceAmount] = useState('')
  const [baseCurrency, setBaseCurrency] = useState<Currency>('CAD')
  const [color, setColor] = useState<string>(CARD_COLORS[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isFormOpen) {
      if (editingPackage) {
        setInstructorName(editingPackage.instructorName)
        setLabel(editingPackage.label)
        setTotalClasses(editingPackage.totalClasses)
        setPriceAmount(String(editingPackage.priceAmount))
        setBaseCurrency(editingPackage.baseCurrency)
        setColor(editingPackage.color)
      } else {
        setInstructorName(prefilledInstructor ?? '')
        setLabel('')
        setTotalClasses(10)
        setPriceAmount('')
        setBaseCurrency('CAD')
        setColor(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)] as string)
      }
    }
  }, [isFormOpen, editingPackage, prefilledInstructor])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!instructorName.trim()) return toast.error('Instructor name is required')
    const price = parseFloat(priceAmount)
    if (isNaN(price) || price <= 0) return toast.error('Enter a valid price')
    if (totalClasses < 1) return toast.error('Package must have at least 1 class')

    setSaving(true)
    try {
      if (editingPackage) {
        await updatePackage(editingPackage.id, {
          instructorName: instructorName.trim(),
          label: label.trim(),
          totalClasses,
          priceAmount: price,
          baseCurrency,
          color,
        })
        toast.success('Package updated!')
      } else {
        await addPackage({
          instructorName: instructorName.trim(),
          label: label.trim(),
          totalClasses,
          priceAmount: price,
          baseCurrency,
          color,
        })
        toast.success('Package added! 🎉')
      }
      closeForm()
    } finally {
      setSaving(false)
    }
  }

  if (!isFormOpen) return null

  return (
    <>
      {/* Full-screen modal */}
      <div
        className="animate-fade-in"
        style={{
          position: 'fixed', inset: 0,
          background: 'var(--bg-base)',
          zIndex: 50,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'max(16px, var(--safe-top)) 20px 16px',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0,
          background: 'var(--bg-base)',
          zIndex: 1,
        }}>
          <button
            type="button"
            onClick={closeForm}
            style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              fontSize: 16, cursor: 'pointer', padding: '4px 0',
            }}
          >
            Cancel
          </button>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
            {editingPackage ? 'Edit package' : 'New package'}
          </h2>
          <div style={{ width: 56 }} />
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px 20px', maxWidth: 430, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
            {editingPackage ? 'Edit package' : 'New class package'}
          </h2>

          {/* Instructor name */}
          <Field label="Instructor name">
            <input
              type="text"
              list="teacher-names"
              value={instructorName}
              onChange={e => setInstructorName(e.target.value)}
              placeholder="e.g. Ana, Marcos…"
              required
              style={inputStyle}
            />
            <datalist id="teacher-names">
              {existingTeachers.map(t => <option key={t} value={t} />)}
            </datalist>
          </Field>

          {/* Dance style */}
          <Field label="Style / label (optional)">
            <input
              type="text"
              list="dance-styles"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Zouk, Salsa, Forró…"
              style={inputStyle}
            />
            <datalist id="dance-styles">
              {DANCE_STYLES.map(s => <option key={s} value={s} />)}
            </datalist>
          </Field>

          {/* Total classes — stepper */}
          <Field label="Classes in this package">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button type="button" onClick={() => setTotalClasses(Math.max(1, totalClasses - 1))}
                style={stepperBtn}>−</button>
              <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', minWidth: 40, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {totalClasses}
              </span>
              <button type="button" onClick={() => setTotalClasses(totalClasses + 1)}
                style={stepperBtn}>+</button>
            </div>
          </Field>

          {/* Price + currency */}
          <Field label="Total price paid">
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={priceAmount}
                onChange={e => setPriceAmount(e.target.value)}
                placeholder="150.00"
                required
                style={{ ...inputStyle, flex: 1 }}
              />
              {/* Currency pill */}
              <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: 12, padding: 3, gap: 2 }}>
                {(['CAD', 'USD', 'BRL'] as Currency[]).map(c => (
                  <button key={c} type="button" onClick={() => setBaseCurrency(c)} style={{
                    padding: '6px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700,
                    background: baseCurrency === c ? 'var(--accent)' : 'transparent',
                    color: baseCurrency === c ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 180ms ease',
                  }}>{c}</button>
                ))}
              </div>
            </div>
          </Field>

          {/* Color picker */}
          <Field label="Card color">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {CARD_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: c, border: 'none', cursor: 'pointer',
                    boxShadow: color === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : 'none',
                    transition: 'box-shadow 150ms ease, transform 150ms ease',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </Field>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%', marginTop: 24, marginBottom: 8,
              padding: '16px', borderRadius: 16, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 17, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
              transition: 'transform 150ms ease, opacity 150ms ease',
              opacity: saving ? 0.7 : 1,
              letterSpacing: '0.02em',
            }}
          >
            {saving ? 'Saving…' : editingPackage ? 'Save changes' : 'Start package'}
          </button>
        </form>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: 16,
  outline: 'none',
  fontFamily: 'inherit',
}

const stepperBtn: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 12, border: '1px solid var(--border)',
  background: 'var(--bg-card)', color: 'var(--text-primary)',
  fontSize: 22, fontWeight: 600, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
