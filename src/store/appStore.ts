import { create } from 'zustand'
import type { Package, AttendanceRecord, Currency, ExchangeRateCache } from '../types'
import {
  sbGetPackages, sbPutPackage, sbDeletePackage,
  sbGetAttendance, sbPutAttendance, sbDeleteAttendance,
} from '../lib/supabase'
import { dbGetSetting, dbSetSetting } from '../db/idb'
import { loadRates, FALLBACK_RATES } from '../lib/currency'

interface AppState {
  // Data
  packages: Package[]
  attendance: AttendanceRecord[]
  // UI
  displayCurrency: Currency
  rates: ExchangeRateCache
  isLoading: boolean
  // Modal state
  isFormOpen: boolean
  editingPackage: Package | null
  activePackageId: string | null

  // Actions
  init(): Promise<void>
  addPackage(data: Omit<Package, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>): Promise<void>
  updatePackage(id: string, patch: Partial<Package>): Promise<void>
  archivePackage(id: string): Promise<void>
  deletePackage(id: string): Promise<void>
  markAttended(packageId: string): Promise<AttendanceRecord>
  undoLastAttendance(packageId: string): Promise<void>
  deleteAttendance(id: string): Promise<void>
  setDisplayCurrency(c: Currency): Promise<void>
  refreshRates(): Promise<void>
  openForm(pkg?: Package): void
  closeForm(): void
  setActivePackage(id: string | null): void
}

// Derived helpers (pure, no store)
export function getAttendanceForPackage(attendance: AttendanceRecord[], packageId: string) {
  return attendance.filter(a => a.packageId === packageId).sort((a, b) => b.attendedAt - a.attendedAt)
}

export function classesUsed(attendance: AttendanceRecord[], packageId: string): number {
  return attendance.filter(a => a.packageId === packageId).length
}

export function pricePerClass(pkg: Package): number {
  return pkg.totalClasses > 0 ? pkg.priceAmount / pkg.totalClasses : 0
}

export function progressPercent(attendance: AttendanceRecord[], pkg: Package): number {
  const used = classesUsed(attendance, pkg.id)
  return Math.min((used / pkg.totalClasses) * 100, 100)
}

export const useAppStore = create<AppState>((set, get) => ({
  packages: [],
  attendance: [],
  displayCurrency: 'CAD',
  rates: FALLBACK_RATES,
  isLoading: true,
  isFormOpen: false,
  editingPackage: null,
  activePackageId: null,

  async init() {
    const [pkgs, att, currency, rates] = await Promise.all([
      sbGetPackages(),
      sbGetAttendance(),
      dbGetSetting<Currency>('displayCurrency'),
      loadRates(),
    ])
    set({
      packages: pkgs,
      attendance: att,
      displayCurrency: currency ?? 'CAD',
      rates,
      isLoading: false,
    })
  },

  async addPackage(data) {
    const pkg: Package = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archivedAt: null,
    }
    await sbPutPackage(pkg)
    set(s => ({ packages: [pkg, ...s.packages] }))
  },

  async updatePackage(id, patch) {
    const pkg = get().packages.find(p => p.id === id)
    if (!pkg) return
    const updated = { ...pkg, ...patch, updatedAt: Date.now() }
    await sbPutPackage(updated)
    set(s => ({ packages: s.packages.map(p => p.id === id ? updated : p) }))
  },

  async archivePackage(id) {
    await get().updatePackage(id, { archivedAt: Date.now() })
  },

  async deletePackage(id) {
    await sbDeletePackage(id)
    set(s => ({
      packages: s.packages.filter(p => p.id !== id),
      attendance: s.attendance.filter(a => a.packageId !== id),
      activePackageId: s.activePackageId === id ? null : s.activePackageId,
    }))
  },

  async markAttended(packageId) {
    const record: AttendanceRecord = {
      id: crypto.randomUUID(),
      packageId,
      attendedAt: Date.now(),
      note: null,
    }
    await sbPutAttendance(record)
    set(s => ({ attendance: [record, ...s.attendance] }))
    if ('vibrate' in navigator) navigator.vibrate(40)
    return record
  },

  async undoLastAttendance(packageId) {
    const records = getAttendanceForPackage(get().attendance, packageId)
    if (!records.length) return
    await get().deleteAttendance(records[0].id)
  },

  async deleteAttendance(id) {
    await sbDeleteAttendance(id)
    set(s => ({ attendance: s.attendance.filter(a => a.id !== id) }))
  },

  async setDisplayCurrency(c) {
    await dbSetSetting('displayCurrency', c)
    set({ displayCurrency: c })
  },

  async refreshRates() {
    const rates = await loadRates()
    set({ rates })
  },

  openForm(pkg) {
    set({ isFormOpen: true, editingPackage: pkg ?? null })
  },

  closeForm() {
    set({ isFormOpen: false, editingPackage: null })
  },

  setActivePackage(id) {
    set({ activePackageId: id })
  },
}))
