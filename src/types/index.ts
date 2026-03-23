export type Currency = 'CAD' | 'USD' | 'BRL'

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
  'Zouk', 'Salsa', 'Forró', 'Bachata', 'Samba', 'Tango',
  'Ballroom', 'Contemporary', 'Ballet', 'Jazz', 'Hip-Hop', 'Other',
] as const
