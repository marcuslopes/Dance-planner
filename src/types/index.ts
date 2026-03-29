export type Currency = 'CAD' | 'USD' | 'BRL'

export interface VideoRecord {
  id: string
  packageId: string
  driveFileId: string      // Google Drive file ID
  driveWebViewLink: string // Google Drive web view URL
  attendedAt: number       // epoch ms — which class session this belongs to
  uploadedAt: number       // epoch ms
  filename: string
  sizeBytes: number
  title: string            // display name; empty = fall back to date
  notes: string            // free-form class notes
}

export interface Package {
  id: string
  instructorName: string
  label: string            // dance style / label e.g. "Wednesday Zouk"
  totalClasses: number
  priceAmount: number      // stored in baseCurrency
  baseCurrency: Currency
  color: string            // hex accent for the card
  createdAt: number        // epoch ms
  updatedAt: number
  archivedAt: number | null
}

export interface AttendanceRecord {
  id: string
  packageId: string
  attendedAt: number       // epoch ms
  note: string | null
  rating: number | null       // 1–5
  learnedNote: string | null  // what was learned
  practiceNote: string | null // what to practice
}

export interface DanceEvent {
  id: string
  name: string
  startDate: number         // epoch ms
  endDate: number | null    // epoch ms — for multi-day events
  location: string | null
  cost: number | null
  baseCurrency: Currency | null
  styles: string[]          // subset of DANCE_STYLES
  notes: string | null
  googleCalendarEventId: string | null
  createdAt: number
  updatedAt: number
}

export interface ExchangeRateCache {
  base: 'CAD'
  rates: { USD: number; BRL: number }
  fetchedAt: number
  isFallback?: boolean
}

export const CARD_COLORS = [
  '#7c3aed', // violet
  '#ec4899', // pink
  '#0d9488', // teal
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f43f5e', // rose
  '#8b5cf6', // purple
] as const

export const DANCE_STYLES = [
  'Zouk', 'Salsa', 'Forró', 'Bachata', 'Lambada', 'Samba', 'Tango',
  'Ballroom', 'Contemporary', 'Ballet', 'Jazz', 'Hip-Hop', 'Other',
] as const

// ── Schedule / Calendar types ─────────────────────────────────────────────────

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  daysOfWeek: number[]     // 0=Sun … 6=Sat (used for weekly/biweekly)
  endDate: number | null   // epoch ms
  count: number | null     // max occurrences
}

export interface ScheduledClass {
  id: string
  packageId: string | null          // optional link to existing package
  title: string
  startTime: number                 // epoch ms
  endTime: number                   // epoch ms
  location: string | null
  recurrence: RecurrenceRule | null
  googleCalendarEventId: string | null
  notes: string | null
  createdAt: number
  updatedAt: number
}
