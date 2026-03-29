import { useAppStore } from '../store/appStore'
import { TeacherClassCard } from './TeacherClassCard'
import { WorkshopCard } from './WorkshopCard'
import { TeacherClassDetail } from './TeacherClassDetail'
import { WorkshopDetail } from './WorkshopDetail'
import type { Inscription } from '../types'

const PAYMENT_COLOR: Record<Inscription['paymentStatus'], string> = {
  paid: '#10b981',
  partial: '#f59e0b',
  unpaid: '#f43f5e',
}

export function TeachingTab() {
  const activeView = useAppStore(s => s.activeTeachingView)
  const setActiveView = useAppStore(s => s.setActiveTeachingView)
  const teacherClasses = useAppStore(s => s.teacherClasses)
  const workshops = useAppStore(s => s.workshops)
  const inscriptions = useAppStore(s => s.inscriptions)
  const openTeacherClassForm = useAppStore(s => s.openTeacherClassForm)
  const openWorkshopForm = useAppStore(s => s.openWorkshopForm)
  const openInscriptionForm = useAppStore(s => s.openInscriptionForm)
  const setActiveTeacherClass = useAppStore(s => s.setActiveTeacherClass)
  const setActiveWorkshop = useAppStore(s => s.setActiveWorkshop)
  const activeTeacherClassId = useAppStore(s => s.activeTeacherClassId)
  const activeWorkshopId = useAppStore(s => s.activeWorkshopId)

  const activeClasses = teacherClasses.filter(c => !c.archivedAt)

  const views = [
    { id: 'classes' as const, label: 'Classes' },
    { id: 'workshops' as const, label: 'Workshops' },
    { id: 'inscriptions' as const, label: 'Students' },
  ]

  function handleFab() {
    if (activeView === 'classes') openTeacherClassForm()
    else if (activeView === 'workshops') openWorkshopForm()
    else if (activeView === 'inscriptions') {
      // Open inscription without a specific target — user picks from list
      if (activeClasses.length > 0) {
        openInscriptionForm(activeClasses[0].id, 'class')
      } else if (workshops.length > 0) {
        openInscriptionForm(workshops[0].id, 'workshop')
      }
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0,
        background: 'var(--bg-base)',
        zIndex: 10,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
            Teaching
          </h1>
        </div>

        {/* Sub-view switcher */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px' }}>
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: '1.5px solid',
                borderColor: activeView === v.id ? '#7c3aed' : 'var(--border)',
                background: activeView === v.id ? 'rgba(124,58,237,0.12)' : 'transparent',
                color: activeView === v.id ? '#a78bfa' : 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px' }}>
        {activeView === 'classes' && (
          <>
            {activeClasses.length === 0 ? (
              <EmptyState
                emoji="🏫"
                title="No classes yet"
                subtitle="Add the group classes you teach — recurring schedules, prices and student sign-ups."
                cta="Add a class"
                onCta={() => openTeacherClassForm()}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>
                {activeClasses.map(tc => (
                  <TeacherClassCard
                    key={tc.id}
                    tc={tc}
                    enrolledCount={inscriptions.filter(i => i.teacherClassId === tc.id).length}
                    onClick={() => setActiveTeacherClass(tc.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeView === 'workshops' && (
          <>
            {workshops.length === 0 ? (
              <EmptyState
                emoji="🎤"
                title="No workshops yet"
                subtitle="Plan one-time workshops or special events with capacity and ticket pricing."
                cta="Add a workshop"
                onCta={() => openWorkshopForm()}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>
                {workshops.map(w => (
                  <WorkshopCard
                    key={w.id}
                    workshop={w}
                    enrolledCount={inscriptions.filter(i => i.workshopId === w.id).length}
                    onClick={() => setActiveWorkshop(w.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeView === 'inscriptions' && (
          <>
            {inscriptions.length === 0 ? (
              <EmptyState
                emoji="🎓"
                title="No students yet"
                subtitle="Open a class or workshop to add students, or add one here."
                cta={activeClasses.length > 0 || workshops.length > 0 ? 'Add a student' : undefined}
                onCta={handleFab}
              />
            ) : (
              <div style={{ paddingTop: 12 }}>
                <AllInscriptionsList
                  inscriptions={inscriptions}
                  teacherClasses={teacherClasses}
                  workshops={workshops}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail panels */}
      {activeTeacherClassId && (
        <TeacherClassDetail
          classId={activeTeacherClassId}
          onClose={() => setActiveTeacherClass(null)}
        />
      )}
      {activeWorkshopId && (
        <WorkshopDetail
          workshopId={activeWorkshopId}
          onClose={() => setActiveWorkshop(null)}
        />
      )}

      {/* FAB */}
      {(activeView === 'classes' || activeView === 'workshops' || (activeView === 'inscriptions' && (activeClasses.length > 0 || workshops.length > 0))) && (
        <button
          onClick={handleFab}
          style={{
            position: 'fixed',
            bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)',
            right: 'max(16px, calc(50vw - 215px + 16px))',
            width: 52, height: 52, borderRadius: '50%',
            background: '#7c3aed', border: 'none',
            color: '#fff', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(124,58,237,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Local helpers ─────────────────────────────────────────────────────────────

function EmptyState({ emoji, title, subtitle, cta, onCta }: {
  emoji: string; title: string; subtitle: string; cta?: string; onCta?: () => void
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 'calc(100svh - 260px)', padding: '0 32px', textAlign: 'center',
    }}>
      <span style={{ fontSize: 48, marginBottom: 16 }}>{emoji}</span>
      <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
      <p style={{ margin: '0 0 28px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>{subtitle}</p>
      {cta && onCta && (
        <button
          onClick={onCta}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 24, border: 'none',
            background: '#7c3aed', color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {cta}
        </button>
      )}
    </div>
  )
}

import type { TeacherClass, Workshop } from '../types'

function AllInscriptionsList({ inscriptions, teacherClasses, workshops }: {
  inscriptions: Inscription[]
  teacherClasses: TeacherClass[]
  workshops: Workshop[]
}) {
  const tcMap = Object.fromEntries(teacherClasses.map(c => [c.id, c]))
  const wsMap = Object.fromEntries(workshops.map(w => [w.id, w]))

  const statusOrder: Record<Inscription['paymentStatus'], number> = { unpaid: 0, partial: 1, paid: 2 }
  const sorted = [...inscriptions].sort((a, b) => statusOrder[a.paymentStatus] - statusOrder[b.paymentStatus])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map(ins => {
        const context = ins.teacherClassId
          ? tcMap[ins.teacherClassId]?.title
          : ins.workshopId
            ? wsMap[ins.workshopId]?.title
            : null
        return (
          <div
            key={ins.id}
            style={{
              padding: '12px 14px',
              background: 'var(--bg-elevated)',
              borderRadius: 12,
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {ins.studentName}
              </div>
              {context && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{context}</div>
              )}
              {ins.contactInfo && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ins.contactInfo}</div>
              )}
            </div>
            <span style={{
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'capitalize',
              background: `${PAYMENT_COLOR[ins.paymentStatus]}22`,
              color: PAYMENT_COLOR[ins.paymentStatus],
            }}>
              {ins.paymentStatus}
            </span>
          </div>
        )
      })}
    </div>
  )
}
