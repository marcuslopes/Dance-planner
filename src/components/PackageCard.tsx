import { useState } from 'react'
import { ProgressRing } from './ProgressRing'
import { useAppStore, classesUsed, progressPercent, pricePerClass, getAttendanceForPackage } from '../store/appStore'
import { convert, formatCurrency } from '../lib/currency'
import type { Package } from '../types'
import { format } from 'date-fns'

interface PackageCardProps {
  pkg: Package
  index: number
}

export function PackageCard({ pkg, index }: PackageCardProps) {
  const { attendance, displayCurrency, rates, markAttended, setActivePackage } = useAppStore()
  const [marking, setMarking] = useState(false)
  const [pulse, setPulse] = useState(false)

  const used = classesUsed(attendance, pkg.id)
  const remaining = pkg.totalClasses - used
  const percent = progressPercent(attendance, pkg)
  const ppc = pricePerClass(pkg)
  const ppcConverted = convert(ppc, pkg.baseCurrency, displayCurrency, rates.rates)
  const totalConverted = convert(pkg.priceAmount, pkg.baseCurrency, displayCurrency, rates.rates)
  const isComplete = remaining <= 0
  const isArchived = !!pkg.archivedAt
  const pkgAttendance = getAttendanceForPackage(attendance, pkg.id)
  const lastClass = pkgAttendance[0]

  async function handleMark(e: React.MouseEvent) {
    e.stopPropagation()
    if (marking || isComplete || isArchived) return
    setMarking(true)
    setPulse(true)
    await markAttended(pkg.id)
    setTimeout(() => setPulse(false), 500)
    setMarking(false)
  }

  const animDelay = `${index * 60}ms`

  return (
    <div
      className="animate-slide-up"
      style={{ animationDelay: animDelay }}
      onClick={() => setActivePackage(pkg.id)}
    >
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        padding: '20px',
        border: `1px solid ${isComplete ? pkg.color + '40' : 'var(--border)'}`,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 150ms ease, box-shadow 150ms ease',
        boxShadow: isComplete ? `0 0 24px ${pkg.color}30` : 'none',
      }}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.985)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.985)')}
        onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {/* Color accent stripe */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
          background: pkg.color, borderRadius: '20px 0 0 20px',
        }} />

        {/* Archived badge */}
        {isArchived && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(255,255,255,0.08)', borderRadius: 8,
            padding: '2px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
          }}>
            ARCHIVED
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', paddingLeft: 12 }}>
          {/* Progress ring */}
          <div style={{ transform: pulse ? 'scale(1.06)' : 'scale(1)', transition: 'transform 400ms cubic-bezier(0.16,1,0.3,1)' }}>
            <ProgressRing
              percent={percent}
              size={88}
              stroke={8}
              label={isComplete ? 'done' : 'left'}
              value={isComplete ? '✓' : String(remaining)}
              sub={`of ${pkg.totalClasses}`}
            />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pkg.instructorName}
              </span>
            </div>
            {pkg.label && (
              <div style={{
                display: 'inline-block', background: pkg.color + '22', color: pkg.color,
                borderRadius: 6, padding: '1px 8px', fontSize: 11, fontWeight: 600,
                marginBottom: 8, letterSpacing: '0.04em',
              }}>
                {pkg.label}
              </div>
            )}

            {/* Price info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(ppcConverted, displayCurrency)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/class</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {formatCurrency(totalConverted, displayCurrency)} total · {used}/{pkg.totalClasses} done
              </span>
              {lastClass && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Last: {format(lastClass.attendedAt, 'MMM d')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mark attended button */}
        {!isArchived && (
          <button
            onClick={handleMark}
            disabled={isComplete || marking}
            style={{
              marginTop: 16,
              marginLeft: 12,
              width: 'calc(100% - 12px)',
              padding: '12px',
              borderRadius: 12,
              border: 'none',
              cursor: isComplete ? 'default' : 'pointer',
              background: isComplete
                ? 'rgba(255,255,255,0.04)'
                : `linear-gradient(135deg, ${pkg.color}, ${pkg.color}cc)`,
              color: isComplete ? 'var(--text-muted)' : '#fff',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.02em',
              transition: 'all 150ms ease',
              boxShadow: isComplete ? 'none' : `0 4px 16px ${pkg.color}40`,
              transform: marking ? 'scale(0.97)' : 'scale(1)',
            }}
          >
            {isComplete ? '✓ Package complete!' : marking ? 'Marking…' : '+ Mark class attended'}
          </button>
        )}
      </div>
    </div>
  )
}
