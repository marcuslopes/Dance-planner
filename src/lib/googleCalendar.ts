import type { RecurrenceRule, ScheduledClass } from '../types'

const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const

// ── Auth helper ────────────────────────────────────────────────────────────────

async function gcFetch(url: string, token: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Google Calendar API ${res.status}: ${text}`)
  }
  // DELETE returns 204 No Content
  if (res.status === 204) return null
  return res.json()
}

// ── RRULE builder ─────────────────────────────────────────────────────────────

function buildRRule(rule: RecurrenceRule): string {
  const parts: string[] = []

  if (rule.frequency === 'weekly') {
    parts.push('FREQ=WEEKLY')
  } else if (rule.frequency === 'biweekly') {
    parts.push('FREQ=WEEKLY', 'INTERVAL=2')
  } else {
    parts.push('FREQ=MONTHLY')
  }

  if ((rule.frequency === 'weekly' || rule.frequency === 'biweekly') && rule.daysOfWeek.length > 0) {
    const days = rule.daysOfWeek.map(d => DAY_CODES[d]).join(',')
    parts.push(`BYDAY=${days}`)
  }

  if (rule.endDate) {
    // Format as YYYYMMDD for UNTIL
    const d = new Date(rule.endDate)
    const until = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}T235959Z`
    parts.push(`UNTIL=${until}`)
  } else if (rule.count) {
    parts.push(`COUNT=${rule.count}`)
  }

  return `RRULE:${parts.join(';')}`
}

// ── Event body builder ────────────────────────────────────────────────────────

interface GCalEventBody {
  summary: string
  location?: string
  description?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  recurrence?: string[]
}

function buildEventBody(cls: Omit<ScheduledClass, 'id' | 'googleCalendarEventId' | 'createdAt' | 'updatedAt'>): GCalEventBody {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const body: GCalEventBody = {
    summary: cls.title,
    start: { dateTime: new Date(cls.startTime).toISOString(), timeZone: tz },
    end: { dateTime: new Date(cls.endTime).toISOString(), timeZone: tz },
  }

  if (cls.location) body.location = cls.location
  if (cls.notes) body.description = cls.notes
  if (cls.recurrence) body.recurrence = [buildRRule(cls.recurrence)]

  return body
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Creates a Google Calendar event. Returns the Google Calendar event ID. */
export async function gcCreateEvent(
  token: string,
  cls: Omit<ScheduledClass, 'id' | 'googleCalendarEventId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const body = buildEventBody(cls)
  const result = await gcFetch(CALENDAR_BASE, token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return result.id as string
}

/** Updates an existing Google Calendar event. */
export async function gcUpdateEvent(
  token: string,
  eventId: string,
  cls: Omit<ScheduledClass, 'id' | 'googleCalendarEventId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const body = buildEventBody(cls)
  await gcFetch(`${CALENDAR_BASE}/${eventId}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

/** Deletes a Google Calendar event. */
export async function gcDeleteEvent(token: string, eventId: string): Promise<void> {
  await gcFetch(`${CALENDAR_BASE}/${eventId}`, token, { method: 'DELETE' })
}
