import { create } from 'zustand'
import toast from 'react-hot-toast'
import type { Package, AttendanceRecord, Currency, ExchangeRateCache, ScheduledClass } from '../types'
import {
  initSpreadsheet, getSheetIds,
  gsGetPackages, gsPutPackage, gsDeletePackage,
  gsGetAttendance, gsPutAttendance, gsDeleteAttendance,
  gsGetSchedule, gsPutSchedule, gsDeleteSchedule,
} from '../lib/googleSheets'
import { gcCreateEvent, gcUpdateEvent, gcDeleteEvent } from '../lib/googleCalendar'
import { dbGetSetting, dbSetSetting } from '../db/idb'
import { loadRates, FALLBACK_RATES } from '../lib/currency'

interface AppState {
  // Data
  packages: Package[]
  attendance: AttendanceRecord[]
  scheduledClasses: ScheduledClass[]
  // Auth / Google
  googleToken: string | null
  spreadsheetId: string | null
  pkgSheetId: number
  attSheetId: number
  schedSheetId: number
  // UI
  displayCurrency: Currency
  rates: ExchangeRateCache
  isLoading: boolean
  signInError: string | null
  // Modal state
  isFormOpen: boolean
  editingPackage: Package | null
  activePackageId: string | null
  // Schedule modal state
  isClassFormOpen: boolean
  editingClass: ScheduledClass | null
  // Tab navigation
  activeTab: 'packages' | 'schedule'

  // Actions
  signIn(token: string): Promise<void>
  init(token: string, spreadsheetId: string, pkgSheetId: number, attSheetId: number, schedSheetId: number): Promise<void>
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
  // Schedule actions
  addScheduledClass(data: Omit<ScheduledClass, 'id' | 'createdAt' | 'updatedAt' | 'googleCalendarEventId'>, addToCalendar: boolean): Promise<void>
  updateScheduledClass(id: string, patch: Partial<ScheduledClass>, syncCalendar: boolean): Promise<void>
  deleteScheduledClass(id: string): Promise<void>
  openClassForm(cls?: ScheduledClass): void
  closeClassForm(): void
  setActiveTab(tab: 'packages' | 'schedule'): void
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
  scheduledClasses: [],
  googleToken: null,
  spreadsheetId: null,
  pkgSheetId: 0,
  attSheetId: 1,
  schedSheetId: 2,
  displayCurrency: 'CAD',
  rates: FALLBACK_RATES,
  isLoading: false,
  signInError: null,
  isFormOpen: false,
  editingPackage: null,
  activePackageId: null,
  isClassFormOpen: false,
  editingClass: null,
  activeTab: 'packages',

  async signIn(token) {
    set({ isLoading: true })
    try {
      const spreadsheetId = await initSpreadsheet(token)
      const { packages: pkgSheetId, attendance: attSheetId, schedule: schedSheetId } = await getSheetIds(token, spreadsheetId)
      // Persist session — Google access tokens last ~1 hour
      localStorage.setItem('gsession', JSON.stringify({ token, spreadsheetId, pkgSheetId, attSheetId, schedSheetId, expiresAt: Date.now() + 55 * 60 * 1000 }))
      set({ googleToken: token, spreadsheetId, pkgSheetId, attSheetId, schedSheetId })
      await get().init(token, spreadsheetId, pkgSheetId, attSheetId, schedSheetId)
    } catch (err) {
      console.error('signIn failed:', err)
      set({ isLoading: false, signInError: err instanceof Error ? err.message : String(err) })
    }
  },

  async init(token, spreadsheetId, pkgSheetId, attSheetId, schedSheetId) {
    set({ isLoading: true })
    const [pkgs, att, schedule, currency, rates] = await Promise.all([
      gsGetPackages(token, spreadsheetId),
      gsGetAttendance(token, spreadsheetId),
      gsGetSchedule(token, spreadsheetId),
      dbGetSetting<Currency>('displayCurrency'),
      loadRates(),
    ])
    set({
      packages: pkgs,
      attendance: att,
      scheduledClasses: schedule,
      pkgSheetId,
      attSheetId,
      schedSheetId,
      displayCurrency: currency ?? 'CAD',
      rates,
      isLoading: false,
    })
  },

  async addPackage(data) {
    const { googleToken: token, spreadsheetId } = get()
    if (!token || !spreadsheetId) return
    const pkg: Package = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archivedAt: null,
    }
    await gsPutPackage(token, spreadsheetId, pkg)
    set(s => ({ packages: [pkg, ...s.packages] }))
  },

  async updatePackage(id, patch) {
    const { googleToken: token, spreadsheetId } = get()
    if (!token || !spreadsheetId) return
    const pkg = get().packages.find(p => p.id === id)
    if (!pkg) return
    const updated = { ...pkg, ...patch, updatedAt: Date.now() }
    await gsPutPackage(token, spreadsheetId, updated)
    set(s => ({ packages: s.packages.map(p => p.id === id ? updated : p) }))
  },

  async archivePackage(id) {
    await get().updatePackage(id, { archivedAt: Date.now() })
  },

  async deletePackage(id) {
    const { googleToken: token, spreadsheetId, pkgSheetId } = get()
    if (!token || !spreadsheetId) return
    await gsDeletePackage(token, spreadsheetId, pkgSheetId, id)
    set(s => ({
      packages: s.packages.filter(p => p.id !== id),
      attendance: s.attendance.filter(a => a.packageId !== id),
      activePackageId: s.activePackageId === id ? null : s.activePackageId,
    }))
  },

  async markAttended(packageId) {
    const { googleToken: token, spreadsheetId } = get()
    if (!token || !spreadsheetId) throw new Error('Not signed in')
    const record: AttendanceRecord = {
      id: crypto.randomUUID(),
      packageId,
      attendedAt: Date.now(),
      note: null,
    }
    await gsPutAttendance(token, spreadsheetId, record)
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
    const { googleToken: token, spreadsheetId, attSheetId } = get()
    if (!token || !spreadsheetId) return
    await gsDeleteAttendance(token, spreadsheetId, attSheetId, id)
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

  // ── Schedule actions ────────────────────────────────────────────────────────

  async addScheduledClass(data, addToCalendar) {
    const { googleToken: token, spreadsheetId } = get()
    if (!token || !spreadsheetId) return

    let googleCalendarEventId: string | null = null
    if (addToCalendar) {
      try {
        googleCalendarEventId = await gcCreateEvent(token, data)
      } catch (err) {
        console.warn('Google Calendar sync failed:', err)
        toast.error('Could not add to Google Calendar. Sign out and sign back in to grant calendar access, then try again.', { duration: 6000 })
      }
    }

    const cls: ScheduledClass = {
      ...data,
      id: crypto.randomUUID(),
      googleCalendarEventId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await gsPutSchedule(token, spreadsheetId, cls)
    set(s => ({ scheduledClasses: [...s.scheduledClasses, cls].sort((a, b) => a.startTime - b.startTime) }))
  },

  async updateScheduledClass(id, patch, syncCalendar) {
    const { googleToken: token, spreadsheetId } = get()
    if (!token || !spreadsheetId) return
    const cls = get().scheduledClasses.find(c => c.id === id)
    if (!cls) return

    const updated: ScheduledClass = { ...cls, ...patch, updatedAt: Date.now() }

    if (syncCalendar && token) {
      try {
        if (updated.googleCalendarEventId) {
          await gcUpdateEvent(token, updated.googleCalendarEventId, updated)
        } else {
          updated.googleCalendarEventId = await gcCreateEvent(token, updated)
        }
      } catch (err) {
        console.warn('Google Calendar sync failed:', err)
        toast.error('Could not sync with Google Calendar. Sign out and sign back in to grant calendar access, then try again.', { duration: 6000 })
      }
    }

    await gsPutSchedule(token, spreadsheetId, updated)
    set(s => ({
      scheduledClasses: s.scheduledClasses
        .map(c => c.id === id ? updated : c)
        .sort((a, b) => a.startTime - b.startTime),
    }))
  },

  async deleteScheduledClass(id) {
    const { googleToken: token, spreadsheetId, schedSheetId } = get()
    if (!token || !spreadsheetId) return
    const cls = get().scheduledClasses.find(c => c.id === id)

    if (cls?.googleCalendarEventId && token) {
      try {
        await gcDeleteEvent(token, cls.googleCalendarEventId)
      } catch (err) {
        console.warn('Google Calendar delete failed:', err)
      }
    }

    await gsDeleteSchedule(token, spreadsheetId, schedSheetId, id)
    set(s => ({ scheduledClasses: s.scheduledClasses.filter(c => c.id !== id) }))
  },

  openClassForm(cls) {
    set({ isClassFormOpen: true, editingClass: cls ?? null })
  },

  closeClassForm() {
    set({ isClassFormOpen: false, editingClass: null })
  },

  setActiveTab(tab) {
    set({ activeTab: tab })
  },
}))
