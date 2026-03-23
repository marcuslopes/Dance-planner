import type { Currency, ExchangeRateCache } from '../types'
import { dbGetRateCache, dbSetRateCache } from '../db/idb'

// Fallback rates (updated at build time — CAD as base)
export const FALLBACK_RATES: ExchangeRateCache = {
  base: 'CAD',
  rates: { USD: 0.72, BRL: 4.05 },
  fetchedAt: Date.now(),
  isFallback: true,
}

const RATE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

export async function loadRates(): Promise<ExchangeRateCache> {
  // 1. Try cached
  const cached = await dbGetRateCache()
  if (cached && Date.now() - cached.fetchedAt < RATE_TTL_MS) {
    return cached
  }

  // 2. Try network
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/CAD', { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const data = await res.json()
      const fresh: ExchangeRateCache = {
        base: 'CAD',
        rates: { USD: data.rates.USD, BRL: data.rates.BRL },
        fetchedAt: Date.now(),
        isFallback: false,
      }
      await dbSetRateCache(fresh)
      return fresh
    }
  } catch {
    // Network unavailable — fall through
  }

  // 3. Use stale cache if available
  if (cached) return cached

  // 4. Hard-coded fallback
  return FALLBACK_RATES
}

export function convert(amount: number, from: Currency, to: Currency, rates: ExchangeRateCache['rates']): number {
  if (from === to) return amount
  // Normalise everything through CAD
  const inCAD = from === 'CAD' ? amount : amount / rates[from]
  return to === 'CAD' ? inCAD : inCAD * rates[to]
}

export function formatCurrency(amount: number, currency: Currency): string {
  try {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function getRateAge(fetchedAt: number): string {
  const diffMs = Date.now() - fetchedAt
  const diffH = Math.floor(diffMs / (1000 * 60 * 60))
  const diffM = Math.floor(diffMs / (1000 * 60))
  if (diffH >= 24) return `${Math.floor(diffH / 24)}d ago`
  if (diffH >= 1) return `${diffH}h ago`
  if (diffM >= 1) return `${diffM}m ago`
  return 'just now'
}
