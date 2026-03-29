import { useMemo } from 'react'
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, format } from 'date-fns'
import { useAppStore, classesUsed, progressPercent } from '../store/appStore'
import { convert, formatCurrency } from '../lib/currency'
import { ProgressRing } from './ProgressRing'
import type { Package, AttendanceRecord } from '../types'

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '16px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</span>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '0 16px', marginTop: 24 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color?: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {count} {count === 1 ? 'class' : 'classes'}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          borderRadius: 99,
          width: `${pct}%`,
          background: color ?? '#7c3aed',
          opacity: 0.8,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

function MonthCompare({ thisCount, lastCount, thisLabel, lastLabel }: {
  thisCount: number; lastCount: number; thisLabel: string; lastLabel: string
}) {
  const max = Math.max(thisCount, lastCount, 1)
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
      <BarRow label={thisLabel} count={thisCount} max={max} color="#7c3aed" />
      <BarRow label={lastLabel} count={lastCount} max={max} color="rgba(124,58,237,0.35)" />
      {thisCount > lastCount && lastCount > 0 && (
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#22c55e', fontWeight: 600 }}>
          +{thisCount - lastCount} more than last month
        </p>
      )}
      {thisCount < lastCount && (
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
          {lastCount - thisCount} fewer than last month
        </p>
      )}
      {thisCount === lastCount && thisCount > 0 && (
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Same as last month
        </p>
      )}
    </div>
  )
}

function PackageProgressRow({ pkg, attendance }: { pkg: Package; attendance: AttendanceRecord[] }) {
  const used = classesUsed(attendance, pkg.id)
  const pct = progressPercent(attendance, pkg)
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '12px 14px',
      marginBottom: 10,
    }}>
      <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 99, background: pkg.color, flexShrink: 0 }} />
      <ProgressRing
        percent={pct}
        size={52}
        stroke={5}
        value={`${used}`}
        sub={`/${pkg.totalClasses}`}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {pkg.instructorName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {pkg.label}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
        {Math.round(pct)}%
      </div>
    </div>
  )
}

// ─── Budget gauge sub-component ──────────────────────────────────────────────

function BudgetGauge({ spent, budget, currency }: { spent: number; budget: number; currency: string }) {
  const pct = Math.min((spent / budget) * 100, 100)
  const color = pct >= 100 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#22c55e'
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        Spent this month
      </div>
      <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: color, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
          {formatCurrency(spent, currency as Parameters<typeof formatCurrency>[1])}
        </span>
        {' of '}
        {formatCurrency(budget, currency as Parameters<typeof formatCurrency>[1])}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnalyticsTab() {
  const packages = useAppStore(s => s.packages)
  const attendance = useAppStore(s => s.attendance)
  const events = useAppStore(s => s.events)
  const displayCurrency = useAppStore(s => s.displayCurrency)
  const rates = useAppStore(s => s.rates)
  const isLoading = useAppStore(s => s.isLoading)
  const monthlyBudget = useAppStore(s => s.monthlyBudget)
  const teacherModeEnabled = useAppStore(s => s.teacherModeEnabled)
  const teacherClasses = useAppStore(s => s.teacherClasses)
  const workshops = useAppStore(s => s.workshops)
  const inscriptions = useAppStore(s => s.inscriptions)

  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))
  const thisYearStart = startOfYear(now)
  const thisYearEnd = endOfYear(now)
  const lastYearStart = startOfYear(subYears(now, 1))
  const lastYearEnd = endOfYear(subYears(now, 1))

  const teachingStats = useMemo(() => {
    const activeClasses = teacherClasses.filter(c => !c.archivedAt)
    const totalStudents = inscriptions.length
    const paidStudents = inscriptions.filter(i => i.paymentStatus === 'paid').length
    const unpaidStudents = inscriptions.filter(i => i.paymentStatus === 'unpaid').length
    const totalRevenue = inscriptions.reduce((sum, i) => sum + (i.amountPaid ?? 0), 0)
    const now = Date.now()
    const upcomingWorkshops = workshops.filter(w => (w.endDate ?? w.startDate) >= now).length
    // Revenue this month
    const monthStart = startOfMonth(new Date()).getTime()
    const monthEnd = endOfMonth(new Date()).getTime()
    const revenueThisMonth = inscriptions
      .filter(i => i.updatedAt >= monthStart && i.updatedAt <= monthEnd && i.amountPaid != null)
      .reduce((sum, i) => sum + (i.amountPaid ?? 0), 0)
    return { activeClasses, totalStudents, paidStudents, unpaidStudents, totalRevenue, upcomingWorkshops, revenueThisMonth }
  }, [teacherClasses, workshops, inscriptions])

  const stats = useMemo(() => {
    const totalClasses = attendance.length
    const activePackages = packages.filter(p => !p.archivedAt)
    const allPackages = packages

    const totalSpent = allPackages.reduce((sum, pkg) => {
      return sum + convert(pkg.priceAmount, pkg.baseCurrency, displayCurrency, rates.rates)
    }, 0)

    const avgCostPerClass = totalClasses > 0 ? totalSpent / totalClasses : 0

    // This month / last month
    const thisMonthCount = attendance.filter(a =>
      a.attendedAt >= thisMonthStart.getTime() && a.attendedAt <= thisMonthEnd.getTime()
    ).length

    const lastMonthCount = attendance.filter(a =>
      a.attendedAt >= lastMonthStart.getTime() && a.attendedAt <= lastMonthEnd.getTime()
    ).length

    // Build a packageId → package map for fast lookup
    const pkgMap = new Map<string, Package>(allPackages.map(p => [p.id, p]))

    // Spending this month
    const spentThisMonth = allPackages.reduce((sum, pkg) => {
      const monthAtt = attendance.filter(a =>
        a.packageId === pkg.id &&
        a.attendedAt >= thisMonthStart.getTime() &&
        a.attendedAt <= thisMonthEnd.getTime()
      ).length
      if (monthAtt === 0) return sum
      const ppc = pkg.totalClasses > 0 ? pkg.priceAmount / pkg.totalClasses : 0
      return sum + convert(ppc * monthAtt, pkg.baseCurrency, displayCurrency, rates.rates)
    }, 0)

    // Forecast: remaining classes across active packages
    const forecastRemainingCost = activePackages.reduce((sum, pkg) => {
      const used = attendance.filter(a => a.packageId === pkg.id).length
      const remaining = Math.max(pkg.totalClasses - used, 0)
      const ppc = pkg.totalClasses > 0 ? pkg.priceAmount / pkg.totalClasses : 0
      return sum + convert(ppc * remaining, pkg.baseCurrency, displayCurrency, rates.rates)
    }, 0)

    // Yearly spend
    const calcYearSpend = (start: Date, end: Date) => {
      return allPackages.reduce((sum, pkg) => {
        const yearAtt = attendance.filter(a =>
          a.packageId === pkg.id &&
          a.attendedAt >= start.getTime() &&
          a.attendedAt <= end.getTime()
        ).length
        if (yearAtt === 0) return sum
        const ppc = pkg.totalClasses > 0 ? pkg.priceAmount / pkg.totalClasses : 0
        return sum + convert(ppc * yearAtt, pkg.baseCurrency, displayCurrency, rates.rates)
      }, 0)
    }
    const thisYearSpend = calcYearSpend(thisYearStart, thisYearEnd)
    const lastYearSpend = calcYearSpend(lastYearStart, lastYearEnd)

    // By teacher
    const teacherCounts = new Map<string, number>()
    for (const a of attendance) {
      const pkg = pkgMap.get(a.packageId)
      if (!pkg) continue
      teacherCounts.set(pkg.instructorName, (teacherCounts.get(pkg.instructorName) ?? 0) + 1)
    }
    const teacherBreakdown = Array.from(teacherCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
    const teacherMax = teacherBreakdown[0]?.count ?? 1

    // By style
    const styleCounts = new Map<string, number>()
    for (const a of attendance) {
      const pkg = pkgMap.get(a.packageId)
      if (!pkg) continue
      styleCounts.set(pkg.label, (styleCounts.get(pkg.label) ?? 0) + 1)
    }
    const styleBreakdown = Array.from(styleCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
    const styleMax = styleBreakdown[0]?.count ?? 1

    // Top rated attendance records
    const topRated = attendance
      .filter(a => a.rating !== null && a.rating >= 1)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 5)
      .map(a => {
        const pkg = pkgMap.get(a.packageId)
        const pkgAtt = attendance.filter(x => x.packageId === a.packageId).sort((x, y) => x.attendedAt - y.attendedAt)
        const classNum = pkgAtt.findIndex(x => x.id === a.id) + 1
        return { record: a, pkg, classNum }
      })

    return {
      totalClasses,
      totalSpent,
      avgCostPerClass,
      activePackages,
      thisMonthCount,
      lastMonthCount,
      teacherBreakdown,
      teacherMax,
      styleBreakdown,
      styleMax,
      spentThisMonth,
      forecastRemainingCost,
      thisYearSpend,
      lastYearSpend,
      topRated,
    }
  }, [packages, attendance, displayCurrency, rates, thisMonthStart, thisMonthEnd, lastMonthStart, lastMonthEnd, thisYearStart, thisYearEnd, lastYearStart, lastYearEnd])

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 32 }}>💃</span>
      </div>
    )
  }

  if (attendance.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 12, textAlign: 'center' }}>
        <span style={{ fontSize: 48 }}>📊</span>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>No stats yet</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Start attending classes and your stats will appear here.
        </p>
      </div>
    )
  }

  const pastEventsCount = events.filter(e => e.startDate < Date.now()).length

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Your Stats</h2>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>All time</span>
      </div>

      {/* Overview — 2×2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px' }}>
        <StatCard label="Classes" value={stats.totalClasses} />
        <StatCard label="Packages" value={stats.activePackages.length} sub="active" />
        <StatCard label="Total Spent" value={formatCurrency(stats.totalSpent, displayCurrency)} />
        <StatCard label="Avg / Class" value={stats.totalClasses > 0 ? formatCurrency(stats.avgCostPerClass, displayCurrency) : '—'} />
      </div>

      {/* Events count */}
      {pastEventsCount > 0 && (
        <div style={{ padding: '10px 16px 0' }}>
          <StatCard label="Events Attended" value={pastEventsCount} sub="workshops & socials" />
        </div>
      )}

      {/* This Month */}
      <Section title={`This Month · ${format(now, 'MMMM')}`}>
        <MonthCompare
          thisCount={stats.thisMonthCount}
          lastCount={stats.lastMonthCount}
          thisLabel={format(now, 'MMMM')}
          lastLabel={format(subMonths(now, 1), 'MMMM')}
        />
      </Section>

      {/* Spending */}
      <Section title="Spending">
        {monthlyBudget != null && (
          <BudgetGauge
            spent={stats.spentThisMonth}
            budget={monthlyBudget}
            currency={displayCurrency}
          />
        )}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Forecast
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(stats.forecastRemainingCost, displayCurrency)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Remaining across active packages
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Yearly
          </div>
          {[
            { label: String(now.getFullYear()), amount: stats.thisYearSpend, color: '#7c3aed' },
            { label: String(now.getFullYear() - 1), amount: stats.lastYearSpend, color: 'rgba(124,58,237,0.35)' },
          ].map(({ label, amount, color }) => {
            const maxAmt = Math.max(stats.thisYearSpend, stats.lastYearSpend, 1)
            const pct = (amount / maxAmt) * 100
            return (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                  <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(amount, displayCurrency)}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: color, opacity: 0.8, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* By Teacher */}
      {stats.teacherBreakdown.length > 0 && (
        <Section title="By Teacher">
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
            {stats.teacherBreakdown.map(({ name, count }) => (
              <BarRow key={name} label={name} count={count} max={stats.teacherMax} />
            ))}
          </div>
        </Section>
      )}

      {/* By Style */}
      {stats.styleBreakdown.length > 0 && (
        <Section title="By Style">
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
            {stats.styleBreakdown.map(({ name, count }) => (
              <BarRow key={name} label={name} count={count} max={stats.styleMax} color="#ec4899" />
            ))}
          </div>
        </Section>
      )}

      {/* Package Progress */}
      {stats.activePackages.length > 0 && (
        <Section title="Package Progress">
          {stats.activePackages.map(pkg => (
            <PackageProgressRow key={pkg.id} pkg={pkg} attendance={attendance} />
          ))}
        </Section>
      )}

      {/* Top Rated Classes */}
      {stats.topRated.length > 0 && (
        <Section title="Top Rated">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.topRated.map(({ record, pkg, classNum }) => (
              <div key={record.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Class #{classNum}
                    </span>
                    {pkg && (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
                        {pkg.instructorName} · {pkg.label}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 1 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} style={{
                        fontSize: 14,
                        color: record.rating !== null && s <= record.rating
                          ? (pkg?.color ?? '#7c3aed')
                          : 'var(--border)',
                      }}>★</span>
                    ))}
                  </div>
                </div>
                {record.learnedNote && (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {record.learnedNote.length > 100 ? record.learnedNote.slice(0, 100) + '…' : record.learnedNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Teaching Stats */}
      {teacherModeEnabled && (teachingStats.activeClasses.length > 0 || workshops.length > 0) && (
        <Section title="Teaching">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <StatCard label="Active Classes" value={teachingStats.activeClasses.length} />
            <StatCard label="Workshops" value={workshops.length} sub={teachingStats.upcomingWorkshops > 0 ? `${teachingStats.upcomingWorkshops} upcoming` : undefined} />
            <StatCard label="Students" value={teachingStats.totalStudents} />
            <StatCard label="Unpaid" value={teachingStats.unpaidStudents} sub={teachingStats.paidStudents > 0 ? `${teachingStats.paidStudents} paid` : undefined} />
          </div>
          {teachingStats.totalRevenue > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Revenue collected
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>
                {teachingStats.totalRevenue.toFixed(2)}
              </div>
              {teachingStats.revenueThisMonth > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {teachingStats.revenueThisMonth.toFixed(2)} this month
                </div>
              )}
            </div>
          )}
        </Section>
      )}
    </div>
  )
}
