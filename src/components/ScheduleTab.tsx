import { format, isToday, isTomorrow, startOfDay } from 'date-fns'
import { useAppStore, getUniqueTeachers } from '../store/appStore'
import { ClassEventCard } from './ClassEventCard'
import { FilterChips } from './FilterChips'
import type { ScheduledClass } from '../types'

function dateGroupLabel(epochMs: number): string {
  const d = new Date(epochMs)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'EEEE, MMM d')
}

function groupByDay(classes: ScheduledClass[]): [string, ScheduledClass[]][] {
  const map = new Map<string, ScheduledClass[]>()
  for (const cls of classes) {
    const key = startOfDay(new Date(cls.startTime)).toISOString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(cls)
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
}

export function ScheduleTab() {
  const scheduledClasses = useAppStore(s => s.scheduledClasses)
  const packages = useAppStore(s => s.packages)
  const openClassForm = useAppStore(s => s.openClassForm)
  const isLoading = useAppStore(s => s.isLoading)
  const filterTeacher = useAppStore(s => s.filterTeacher)
  const filterStyle = useAppStore(s => s.filterStyle)
  const setFilterTeacher = useAppStore(s => s.setFilterTeacher)
  const setFilterStyle = useAppStore(s => s.setFilterStyle)

  const now = Date.now()

  const pkgMap = Object.fromEntries(packages.map(p => [p.id, p]))

  const teachers = getUniqueTeachers(packages)
  const uniqueStyles = [...new Set(packages.map(p => p.label.trim()).filter(Boolean))].sort()
  const showFilters = scheduledClasses.length > 0 && (teachers.length >= 2 || uniqueStyles.length >= 2)

  // Apply filters: a class passes if it has no package (standalone, shown always)
  // or its linked package matches both active filters
  function classMatchesFilters(cls: ScheduledClass): boolean {
    if (!cls.packageId) return true
    const pkg = pkgMap[cls.packageId]
    if (!pkg) return true
    if (filterTeacher && pkg.instructorName !== filterTeacher) return false
    if (filterStyle && pkg.label.trim() !== filterStyle) return false
    return true
  }

  const upcoming = scheduledClasses.filter(c => c.endTime >= now && classMatchesFilters(c))
  const past = scheduledClasses.filter(c => c.endTime < now && classMatchesFilters(c)).slice(0, 10)

  const upcomingGroups = groupByDay(upcoming)
  const pastGroups = groupByDay(past.slice().reverse()).reverse()

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      paddingBottom: 80,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'var(--bg-base)',
        zIndex: 10,
        borderBottom: scheduledClasses.length > 0 ? '1px solid var(--border)' : 'none',
      }}>
        <div style={{
          padding: '20px 20px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
            Schedule
          </h1>
        </div>

        {/* Filter chips */}
        {showFilters && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 12 }}>
            {teachers.length >= 2 && (
              <FilterChips
                items={teachers}
                active={filterTeacher}
                onSelect={setFilterTeacher}
                label="Teacher"
              />
            )}
            {uniqueStyles.length >= 2 && (
              <FilterChips
                items={uniqueStyles}
                active={filterStyle}
                onSelect={setFilterStyle}
                label="Style"
              />
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <span style={{ fontSize: 32 }}>💃</span>
        </div>
      ) : scheduledClasses.length === 0 ? (
        // Empty state
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: 'calc(100svh - 180px)',
          padding: '0 32px',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: 48, marginBottom: 16 }}>📅</span>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            No classes planned yet
          </h2>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Plan your upcoming dance classes and sync them to your Google Calendar.
          </p>
          <button
            onClick={() => openClassForm()}
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
            Plan a class
          </button>
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          {/* Upcoming */}
          {upcomingGroups.length > 0 && (
            <>
              <div style={{ padding: '16px 4px 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
                Upcoming
              </div>
              {upcomingGroups.map(([dayKey, classes]) => (
                <div key={dayKey} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, paddingLeft: 4 }}>
                    {dateGroupLabel(new Date(dayKey).getTime())}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {classes.map(cls => (
                      <ClassEventCard
                        key={cls.id}
                        cls={cls}
                        pkg={cls.packageId ? pkgMap[cls.packageId] : undefined}
                        onClick={() => openClassForm(cls)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Past */}
          {pastGroups.length > 0 && (
            <>
              <div style={{ padding: '8px 4px 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
                Recent
              </div>
              {pastGroups.map(([dayKey, classes]) => (
                <div key={dayKey} style={{ marginBottom: 20, opacity: 0.6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, paddingLeft: 4 }}>
                    {format(new Date(dayKey), 'EEEE, MMM d')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {classes.map(cls => (
                      <ClassEventCard
                        key={cls.id}
                        cls={cls}
                        pkg={cls.packageId ? pkgMap[cls.packageId] : undefined}
                        onClick={() => openClassForm(cls)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* No results after filter */}
          {upcomingGroups.length === 0 && pastGroups.length === 0 && (filterTeacher || filterStyle) && (
            <div style={{ padding: '32px 4px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No classes match the current filter
            </div>
          )}

          {/* No upcoming but has history */}
          {upcomingGroups.length === 0 && pastGroups.length > 0 && !(filterTeacher || filterStyle) && (
            <div style={{ padding: '8px 4px 16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              No upcoming classes — tap + to plan one
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      {scheduledClasses.length > 0 && (
        <button
          onClick={() => openClassForm()}
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
