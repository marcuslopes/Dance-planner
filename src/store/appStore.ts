import { create } from 'zustand'
import toast from 'react-hot-toast'
import type { Package, AttendanceRecord, Currency, ExchangeRateCache, ScheduledClass, VideoRecord } from '../types'
import {
  initSpreadsheet, getSheetIds,
  gsGetPackages, gsPutPackage, gsDeletePackage,
  gsGetAttendance, gsPutAttendance, gsDeleteAttendance,
  gsGetSchedule, gsPutSchedule, gsDeleteSchedule,
  gsGetSettings, gsPutSetting,
  gsGetVideos, gsPutVideo, gsDeleteVideo,
} from '../lib/googleSheets'
import { gcCreateEvent, gcUpdateEvent, gcDeleteEvent } from '../lib/googleCalendar'
import { dbGetSetting, dbSetSetting } from '../db/idb'
import { expandOccurrences } from '../lib/recurrence'
import { loadRates, FALLBACK_RATES } from '../lib/currency'
import {
  styleFromLabel, ensureStylePage, ensurePackagePage,
  uploadVideoToPage, clearNotionCache,
} from '../lib/notion'
import { compressVideo, VIDEO_SIZE_LIMIT_MB } from '../lib/videoCompression'

interface AppState {
  // Data
  packages: Package[]
  attendance: AttendanceRecord[]
  scheduledClasses: ScheduledClass[]
  videos: VideoRecord[]
  // Auth / Google
  googleToken: string | null
  spreadsheetId: string | null
  pkgSheetId: number
  attSheetId: number
  schedSheetId: number
  videoSheetId: number
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
  activeTab: 'packages' | 'schedule' | 'settings'
  // Settings
  autoCompleteClasses: boolean
  // Notion
  notionToken: string | null
  notionRootPageId: string | null
  isVideoUploading: boolean
  videoUploadProgress: number  // 0–100

  // Actions
  signIn(token: string): Promise<void>
  setSignInError(msg: string | null): void
  init(token: string, spreadsheetId: string, pkgSheetId: number, attSheetId: number, schedSheetId: number, videoSheetId: number): Promise<void>
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
  setActiveTab(tab: 'packages' | 'schedule' | 'settings'): void
  setAutoCompleteClasses(value: boolean): Promise<void>
  _runAutoComplete(): Promise<void>
  // Notion actions
  setNotionConfig(token: string, rootPageId: string): Promise<void>
  disconnectNotion(): Promise<void>
  uploadClassVideo(packageId: string, file: File, attendedAt: number): Promise<void>
  deleteVideo(id: string): Promise<void>
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
  videos: [],
  googleToken: null,
  spreadsheetId: null,
  pkgSheetId: 0,
  attSheetId: 1,
  schedSheetId: 2,
  videoSheetId: 4,
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
  autoCompleteClasses: false,
  notionToken: null,
  notionRootPageId: null,
  isVideoUploading: false,
  videoUploadProgress: 0,

  setSignInError(msg) {
    set({ signInError: msg })
  },

  async signIn(token) {
    set({ isLoading: true, signInError: null })
    try {
      const spreadsheetId = await initSpreadsheet(token)
      const { packages: pkgSheetId, attendance: attSheetId, schedule: schedSheetId, videos: videoSheetId } = await getSheetIds(token, spreadsheetId)
      // Persist session — Google access tokens last ~1 hour
      localStorage.setItem('gsession', JSON.stringify({ token, spreadsheetId, pkgSheetId, attSheetId, schedSheetId, videoSheetId, expiresAt: Date.now() + 55 * 60 * 1000 }))
      set({ googleToken: token, spreadsheetId, pkgSheetId, attSheetId, schedSheetId, videoSheetId })
      await get().init(token, spreadsheetId, pkgSheetId, attSheetId, schedSheetId, videoSheetId)
    } catch (err) {
      console.error('signIn failed:', err)
      const msg = err instanceof Error ? err.message : String(err)
      const isAuthError = msg.includes('401') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('unauthenticated')
      if (isAuthError) {
        localStorage.removeItem('gsession')
        set({ isLoading: false, signInError: 'Session expired. Please sign in again.' })
      } else {
        set({ isLoading: false, signInError: msg })
      }
    }
  },

  async init(token, spreadsheetId, pkgSheetId, attSheetId, schedSheetId, videoSheetId) {
    set({ isLoading: true })
    const [pkgs, att, schedule, videos, cloudSettings, localCurrency, localAutoComplete, rates] = await Promise.all([
      gsGetPackages(token, spreadsheetId),
      gsGetAttendance(token, spreadsheetId),
      gsGetSchedule(token, spreadsheetId),
      gsGetVideos(token, spreadsheetId),
      gsGetSettings(token, spreadsheetId),
      dbGetSetting<Currency>('displayCurrency'),
      dbGetSetting<boolean>('autoCompleteClasses'),
      loadRates(),
    ])

    // Cloud settings win over local IDB; fall back to local then defaults
    const currency = (cloudSettings['displayCurrency'] as Currency | undefined)
      ?? localCurrency ?? 'CAD'
    const autoComplete = (cloudSettings['autoCompleteClasses'] as boolean | undefined)
      ?? localAutoComplete ?? false
    const notionToken = (cloudSettings['notionToken'] as string | undefined) ?? null
    const notionRootPageId = (cloudSettings['notionRootPageId'] as string | undefined) ?? null

    // Sync cloud values back into IDB so next cold-start is up-to-date
    await Promise.all([
      dbSetSetting('displayCurrency', currency),
      dbSetSetting('autoCompleteClasses', autoComplete),
    ])

    set({
      packages: pkgs,
      attendance: att,
      scheduledClasses: schedule,
      videos,
      pkgSheetId,
      attSheetId,
      schedSheetId,
      videoSheetId,
      displayCurrency: currency,
      rates,
      autoCompleteClasses: autoComplete,
      notionToken,
      notionRootPageId,
      isLoading: false,
    })
    if (autoComplete) await get()._runAutoComplete()
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
    const { googleToken: token, spreadsheetId } = get()
    if (token && spreadsheetId) {
      gsPutSetting(token, spreadsheetId, 'displayCurrency', c).catch(err =>
        console.warn('Failed to sync displayCurrency to Sheets:', err)
      )
    }
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
        const calPkg = data.packageId ? get().packages.find(p => p.id === data.packageId) ?? null : null
        const calData = calPkg
          ? { ...data, title: `${calPkg.label} with ${calPkg.instructorName}` }
          : data
        googleCalendarEventId = await gcCreateEvent(token, calData)
      } catch (err) {
        console.warn('Google Calendar sync failed:', err)
        toast.error(`Calendar: ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`, { duration: 8000 })
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
        const calPkg = updated.packageId ? get().packages.find(p => p.id === updated.packageId) ?? null : null
        const calData = calPkg
          ? { ...updated, title: `${calPkg.label} with ${calPkg.instructorName}` }
          : updated
        if (updated.googleCalendarEventId) {
          await gcUpdateEvent(token, updated.googleCalendarEventId, calData)
        } else {
          updated.googleCalendarEventId = await gcCreateEvent(token, calData)
        }
      } catch (err) {
        console.warn('Google Calendar sync failed:', err)
        toast.error(`Calendar: ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`, { duration: 8000 })
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

  async setAutoCompleteClasses(value) {
    await dbSetSetting('autoCompleteClasses', value)
    set({ autoCompleteClasses: value })
    const { googleToken: token, spreadsheetId } = get()
    if (token && spreadsheetId) {
      gsPutSetting(token, spreadsheetId, 'autoCompleteClasses', value).catch(err =>
        console.warn('Failed to sync autoCompleteClasses to Sheets:', err)
      )
    }
    if (value) await get()._runAutoComplete()
  },

  async _runAutoComplete() {
    const { googleToken: token, spreadsheetId, scheduledClasses, attendance } = get()
    if (!token || !spreadsheetId) return

    const now = Date.now()
    const newRecords: AttendanceRecord[] = []

    for (const cls of scheduledClasses) {
      if (!cls.packageId) continue
      const occurrences = expandOccurrences(cls, now)
      for (const occTs of occurrences) {
        const noteKey = `__auto__:${cls.id}:${occTs}`
        const alreadyExists = attendance.some(a => a.note === noteKey) ||
          newRecords.some(a => a.note === noteKey)
        if (alreadyExists) continue
        const record: AttendanceRecord = {
          id: crypto.randomUUID(),
          packageId: cls.packageId,
          attendedAt: occTs,
          note: noteKey,
        }
        try {
          await gsPutAttendance(token, spreadsheetId, record)
          newRecords.push(record)
        } catch (err) {
          console.warn('Auto-complete attendance write failed:', err)
        }
      }
    }

    if (newRecords.length > 0) {
      set(s => ({ attendance: [...newRecords, ...s.attendance].sort((a, b) => b.attendedAt - a.attendedAt) }))
    }
  },

  // ── Notion actions ────────────────────────────────────────────────────────────

  async setNotionConfig(token, rootPageId) {
    const { googleToken, spreadsheetId } = get()
    set({ notionToken: token, notionRootPageId: rootPageId })
    if (googleToken && spreadsheetId) {
      await Promise.all([
        gsPutSetting(googleToken, spreadsheetId, 'notionToken', token),
        gsPutSetting(googleToken, spreadsheetId, 'notionRootPageId', rootPageId),
      ])
    }
    toast.success('Notion connected!')
  },

  async disconnectNotion() {
    const { googleToken, spreadsheetId } = get()
    clearNotionCache()
    set({ notionToken: null, notionRootPageId: null })
    if (googleToken && spreadsheetId) {
      await Promise.all([
        gsPutSetting(googleToken, spreadsheetId, 'notionToken', ''),
        gsPutSetting(googleToken, spreadsheetId, 'notionRootPageId', ''),
      ])
    }
    toast('Notion disconnected', { icon: '🔌' })
  },

  async uploadClassVideo(packageId, file, attendedAt) {
    const { googleToken, spreadsheetId, notionToken, notionRootPageId, packages } = get()
    if (!googleToken || !spreadsheetId) throw new Error('Not signed in')
    if (!notionToken || !notionRootPageId) throw new Error('Notion not connected')

    const pkg = packages.find(p => p.id === packageId)
    if (!pkg) throw new Error('Package not found')

    set({ isVideoUploading: true, videoUploadProgress: 0 })

    try {
      // 1. Compress
      const compressed = await compressVideo(file, VIDEO_SIZE_LIMIT_MB, pct => {
        set({ videoUploadProgress: Math.round(pct * 0.7) }) // compression = 0–70%
      })

      set({ videoUploadProgress: 72 })

      // 2. Ensure Notion page hierarchy
      const style = styleFromLabel(pkg.label)
      const stylePageId = await ensureStylePage(notionToken, notionRootPageId, style)
      const packagePageId = await ensurePackagePage(notionToken, stylePageId, pkg)

      set({ videoUploadProgress: 80 })

      // 3. Upload to Notion
      const filename = `class-${new Date(attendedAt).toISOString().slice(0, 10)}.mp4`
      const { blockId, pageUrl } = await uploadVideoToPage(
        notionToken,
        packagePageId,
        compressed,
        filename,
        new Date(attendedAt),
      )

      set({ videoUploadProgress: 95 })

      // 4. Persist VideoRecord to Google Sheets
      const record: VideoRecord = {
        id: crypto.randomUUID(),
        packageId,
        notionBlockId: blockId,
        notionPageUrl: pageUrl,
        attendedAt,
        uploadedAt: Date.now(),
        filename,
        sizeBytes: compressed.size,
      }
      await gsPutVideo(googleToken, spreadsheetId, record)
      set(s => ({ videos: [record, ...s.videos], videoUploadProgress: 100 }))

      toast.success('Video saved to Notion!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Upload failed: ${msg.slice(0, 120)}`, { duration: 8000 })
      throw err
    } finally {
      set({ isVideoUploading: false, videoUploadProgress: 0 })
    }
  },

  async deleteVideo(id) {
    const { googleToken, spreadsheetId, videoSheetId } = get()
    if (!googleToken || !spreadsheetId) return
    await gsDeleteVideo(googleToken, spreadsheetId, videoSheetId, id)
    set(s => ({ videos: s.videos.filter(v => v.id !== id) }))
  },
}))
