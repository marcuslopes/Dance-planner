import { X, Plus } from 'lucide-react'
import { useAppStore, classesUsed, progressPercent } from '../store/appStore'
import type { Package } from '../types'

interface TeacherDetailProps {
  teacherName: string | null
  onClose: () => void
}

export function TeacherDetail({ teacherName, onClose }: TeacherDetailProps) {
  if (!teacherName) return null
  return <TeacherDetailInner teacherName={teacherName} onClose={onClose} />
}

function PackageRow({ pkg }: { pkg: Package }) {
  const { attendance, setActivePackage } = useAppStore()
  const used = classesUsed(attendance, pkg.id)
  const percent = Math.round(progressPercent(attendance, pkg))
  const isComplete = used >= pkg.totalClasses

  return (
    <button
      onClick={() => setActivePackage(pkg.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', textAlign: 'left',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14, padding: '12px 14px',
        cursor: 'pointer',
        transition: 'transform 120ms ease',
        opacity: pkg.archivedAt ? 0.6 : 1,
      }}
      onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {/* Color swatch */}
      <div style={{
        width: 10, height: 10, borderRadius: 3, flexShrink: 0,
        background: pkg.color,
        boxShadow: `0 0 0 3px ${pkg.color}33`,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
          {pkg.label || 'No style'}
          {pkg.archivedAt && (
            <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 6 }}>
              archived
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {used}/{pkg.totalClasses} classes
          {isComplete && ' · Complete ✓'}
        </div>
      </div>

      {/* Mini progress bar */}
      <div style={{ width: 48, height: 4, borderRadius: 2, background: 'var(--border)', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: pkg.color, borderRadius: 2, transition: 'width 300ms ease' }} />
      </div>
    </button>
  )
}

function TeacherDetailInner({ teacherName, onClose }: { teacherName: string; onClose: () => void }) {
  const { packages, openFormForTeacher } = useAppStore()

  const teacherPackages = packages.filter(p => p.instructorName === teacherName)
  const active = teacherPackages.filter(p => !p.archivedAt)
  const archived = teacherPackages.filter(p => !!p.archivedAt)

  function handleAddPackage() {
    onClose()
    openFormForTeacher(teacherName)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="animate-fade-in"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 40, backdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        zIndex: 50, pointerEvents: 'none',
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
          {/* Drag handle + close */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px 0' }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--text-muted)' }} />
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex' }}>
              <X size={20} />
            </button>
          </div>

          {/* Header */}
          <div style={{ padding: '16px 24px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'var(--accent)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800, color: '#fff',
                letterSpacing: '-0.02em', flexShrink: 0,
              }}>
                {teacherName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {teacherName}
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                  {active.length} active · {archived.length} completed
                </p>
              </div>
            </div>
          </div>

          {/* Package list */}
          <div className="scroll-area" style={{ flex: 1, padding: '0 20px', overflowY: 'auto' }}>
            {teacherPackages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                No packages yet
              </div>
            ) : (
              <>
                {active.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Active
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {active.map(pkg => <PackageRow key={pkg.id} pkg={pkg} />)}
                    </div>
                  </div>
                )}
                {archived.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Completed
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {archived.map(pkg => <PackageRow key={pkg.id} pkg={pkg} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Add package CTA */}
          <div style={{ padding: '16px 24px 0' }}>
            <button
              onClick={handleAddPackage}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '16px',
                borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, var(--accent), #6d28d9)',
                color: '#fff',
                fontSize: 17, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(124,58,237,0.5)',
                transition: 'all 150ms ease',
                letterSpacing: '0.02em',
                fontFamily: 'inherit',
              }}
            >
              <Plus size={20} strokeWidth={2.5} />
              Add package for {teacherName}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
