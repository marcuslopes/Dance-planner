import { useEffect, useRef } from 'react'
import { ProgressRing } from './ProgressRing'
import { useAppStore, classesUsed, progressPercent, pricePerClass, getAttendanceForPackage } from '../store/appStore'
import { convert, formatCurrency, getRateAge } from '../lib/currency'
import { format } from 'date-fns'
import { Trash2, Pencil, X, Undo2 } from 'lucide-react'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import type { Package } from '../types'

// Guard wrapper — renders nothing when no package is active
export function PackageDetail() {
  const { packages, activePackageId } = useAppStore()
  const pkg = packages.find(p => p.id === activePackageId)
  if (!pkg) return null
  return <PackageDetailInner pkg={pkg} />
}

function PackageDetailInner({ pkg }: { pkg: Package }) {
  const {
    attendance, displayCurrency, rates,
    setActivePackage, openForm, archivePackage, deletePackage,
    markAttended, undoLastAttendance, deleteAttendance,
  } = useAppStore()
  const prevUsed = useRef<number | null>(null)

  const used = classesUsed(attendance, pkg.id)
  const remaining = pkg.totalClasses - used
  const percent = progressPercent(attendance, pkg)
  const ppc = pricePerClass(pkg)
  const ppcConverted = convert(ppc, pkg.baseCurrency, displayCurrency, rates.rates)
  const totalConverted = convert(pkg.priceAmount, pkg.baseCurrency, displayCurrency, rates.rates)
  const isComplete = remaining <= 0
  const isArchived = !!pkg.archivedAt
  const pkgAttendance = getAttendanceForPackage(attendance, pkg.id)

  // Confetti on package completion
  useEffect(() => {
    if (prevUsed.current !== null && used > prevUsed.current && isComplete) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: [pkg.color, '#a78bfa', '#ec4899', '#f59e0b'],
      })
      toast.success(`Package complete! All ${pkg.totalClasses} classes done 🎉`, { duration: 4000 })
    }
    prevUsed.current = used
  }, [used, isComplete, pkg.color, pkg.totalClasses])

  async function handleMark() {
    if (isComplete || isArchived) return
    await markAttended(pkg.id)
    if ('vibrate' in navigator) navigator.vibrate(40)
  }

  async function handleUndo() {
    await undoLastAttendance(pkg.id)
    toast('Last class undone', { icon: '↩️' })
  }

  async function handleDelete() {
    if (!confirm(`Delete package with ${pkg.instructorName}? This cannot be undone.`)) return
    await deletePackage(pkg.id)
    setActivePackage(null)
    toast.success('Package deleted')
  }

  async function handleArchive() {
    await archivePackage(pkg.id)
    toast.success('Package archived')
    setActivePackage(null)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="animate-fade-in"
        onClick={() => setActivePackage(null)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 40, backdropFilter: 'blur(4px)',
        }}
      />

      {/* Detail sheet */}
      <div
        className="sheet-enter"
        style={{
          position: 'fixed', bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          background: 'var(--bg-elevated)',
          borderRadius: '24px 24px 0 0',
          zIndex: 50,
          paddingBottom: 'max(24px, var(--safe-bottom))',
          maxHeight: '92dvh',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Drag handle + close */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px 0' }}>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--text-muted)' }} />
          </div>
          <button onClick={() => setActivePackage(null)} style={iconBtn}>
            <X size={20} />
          </button>
        </div>

        <div className="scroll-area" style={{ flex: 1, padding: '16px 24px 0' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                {pkg.instructorName}
              </h2>
              {pkg.label && (
                <span style={{
                  display: 'inline-block', marginTop: 4,
                  background: pkg.color + '22', color: pkg.color,
                  borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600,
                }}>
                  {pkg.label}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setActivePackage(null); openForm(pkg) }} style={iconBtn}>
                <Pencil size={18} />
              </button>
              <button onClick={handleDelete} style={{ ...iconBtn, color: 'var(--danger)' }}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Big progress ring */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <ProgressRing
              percent={percent}
              size={160}
              stroke={14}
              label={isComplete ? 'complete!' : 'classes left'}
              value={isComplete ? '✓' : String(remaining)}
              sub={`${used} of ${pkg.totalClasses} done`}
            />
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
            <StatBox label="Per class" value={formatCurrency(ppcConverted, displayCurrency)} color={pkg.color} />
            <StatBox label="Total paid" value={formatCurrency(totalConverted, displayCurrency)} />
            <StatBox label="Progress" value={`${Math.round(percent)}%`} />
          </div>

          {/* Rate info */}
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 16px' }}>
            {rates.isFallback ? 'Using estimated exchange rates' : `Rates updated ${getRateAge(rates.fetchedAt)}`}
          </p>

          {/* Archive button */}
          {isComplete && !isArchived && (
            <button onClick={handleArchive} style={{
              width: '100%', padding: '12px', marginBottom: 16,
              borderRadius: 12, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Archive this package
            </button>
          )}

          {/* Attendance log */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Class history
              </h3>
              {pkgAttendance.length > 0 && !isArchived && (
                <button onClick={handleUndo} style={{ ...iconBtn, fontSize: 12, gap: 4, display: 'flex', alignItems: 'center', padding: '4px 10px', borderRadius: 8 }}>
                  <Undo2 size={14} />
                  <span>Undo last</span>
                </button>
              )}
            </div>

            {pkgAttendance.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
                No classes logged yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {pkgAttendance.map((rec, i) => (
                  <div key={rec.id} className="animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: i < pkgAttendance.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div>
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                          Class #{pkgAttendance.length - i}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 10 }}>
                          {format(rec.attendedAt, 'MMM d, yyyy')}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteAttendance(rec.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mark attended CTA */}
        {!isArchived && (
          <div style={{ padding: '16px 24px 0' }}>
            <button
              onClick={handleMark}
              disabled={isComplete}
              style={{
                width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                background: isComplete
                  ? 'rgba(255,255,255,0.06)'
                  : `linear-gradient(135deg, ${pkg.color}, ${pkg.color}cc)`,
                color: isComplete ? 'var(--text-muted)' : '#fff',
                fontSize: 17, fontWeight: 700, cursor: isComplete ? 'default' : 'pointer',
                boxShadow: isComplete ? 'none' : `0 4px 24px ${pkg.color}50`,
                transition: 'all 150ms ease',
                letterSpacing: '0.02em',
              }}
            >
              {isComplete ? '✓ Package complete!' : '+ Mark class attended'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: color ?? 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '8px', cursor: 'pointer',
  color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
