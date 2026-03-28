import type { ScheduledClass } from '../types'

/**
 * Returns the startTime (ms) of every occurrence of a scheduled class up to
 * and including `until` (ms epoch). Handles both non-recurrent and recurrent
 * classes (weekly, biweekly, monthly).
 */
export function expandOccurrences(cls: ScheduledClass, until: number): number[] {
  const duration = cls.endTime - cls.startTime
  const rule = cls.recurrence

  // Non-recurrent: single occurrence
  if (!rule) {
    return cls.endTime <= until ? [cls.startTime] : []
  }

  const results: number[] = []
  let count = 0

  if (rule.frequency === 'monthly') {
    const d = new Date(cls.startTime)
    const dayOfMonth = d.getDate()
    while (true) {
      const ts = d.getTime()
      if (ts + duration > until) break
      if (rule.endDate != null && ts > rule.endDate) break
      if (rule.count != null && count >= rule.count) break
      results.push(ts)
      count++
      // Advance one month
      d.setMonth(d.getMonth() + 1)
      // Clamp to valid day (e.g. Jan 31 → Feb 28)
      if (d.getDate() !== dayOfMonth) {
        d.setDate(0) // last day of previous month
      }
    }
    return results
  }

  // Weekly or biweekly
  const intervalMs = (rule.frequency === 'biweekly' ? 14 : 7) * 24 * 60 * 60 * 1000
  const daysOfWeek = rule.daysOfWeek.length > 0
    ? [...rule.daysOfWeek].sort((a, b) => a - b)
    : [new Date(cls.startTime).getDay()]

  // Find the Monday (day 0 = Sunday) of the week containing cls.startTime
  const startDate = new Date(cls.startTime)
  // Move back to Sunday of that week
  const sundayOffset = startDate.getDay() // 0=Sun
  const weekSundayMs = cls.startTime - sundayOffset * 24 * 60 * 60 * 1000

  let weekStart = weekSundayMs
  const maxIterations = 10000 // safety cap

  for (let iter = 0; iter < maxIterations; iter++) {
    let anyInThisWeek = false

    for (const day of daysOfWeek) {
      const occTs = weekStart + day * 24 * 60 * 60 * 1000
      // Must be on or after the original class start
      if (occTs < cls.startTime) continue
      if (occTs + duration > until) continue
      if (rule.endDate != null && occTs > rule.endDate) continue
      if (rule.count != null && count >= rule.count) break

      results.push(occTs)
      count++
      anyInThisWeek = true
    }

    // Stop if we've exhausted count or gone past until/endDate
    if (rule.count != null && count >= rule.count) break
    weekStart += intervalMs
    if (weekStart > until) break
    if (rule.endDate != null && weekStart > rule.endDate) break

    // For biweekly, if nothing matched this week (first week of pair) that's ok
    void anyInThisWeek
  }

  return results
}
