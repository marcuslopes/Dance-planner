import { useMemo } from 'react'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
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

// ─── Main component ───────────────────────────────────────────────────────────

export function AnalyticsTab() {
  const packages = useAppStore(s => s.packages)
  const attendance = useAppStore(s => s.attendance)
  const displayCurrency = useAppStore(s => s.displayCurrency)
  const rates = useAppStore(s => s.rates)
  const isLoading = useAppStore(s => s.isLoading)

  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

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
    }
  }, [packages, attendance, displayCurrency, rates, thisMonthStart, thisMonthEnd, lastMonthStart, lastMonthEnd])

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

      {/* This Month */}
      <Section title={`This Month · ${format(now, 'MMMM')}`}>
        <MonthCompare
          thisCount={stats.thisMonthCount}
          lastCount={stats.lastMonthCount}
          thisLabel={format(now, 'MMMM')}
          lastLabel={format(subMonths(now, 1), 'MMMM')}
        />
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
    </div>
  )
}
