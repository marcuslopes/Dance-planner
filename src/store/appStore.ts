import { create } from 'zustand'
import toast from 'react-hot-toast'
import type { Package, AttendanceRecord, Currency, ExchangeRateCache, ScheduledClass, VideoRecord, DanceEvent } from '../types'
import {
  initSpreadsheet, getSheetIds,
  gsGetPackages, gsPutPackage, gsDeletePackage,
  gsGetAttendance, gsPutAttendance, gsDeleteAttendance,
  gsGetSchedule, gsPutSchedule, gsDeleteSchedule,
  gsGetSettings, gsPutSetting,
  gsGetVideos, gsPutVideo, gsDeleteVideo,
  gsGetEvents, gsPutEvent, gsDeleteEvent,
} from '../lib/googleSheets'
import { gcCreateEvent, gcUpdateEvent, gcDeleteEvent, gcCreateAllDayEvent, gcUpdateAllDayEvent } from '../lib/googleCalendar'
import { dbGetSetting, dbSetSetting } from '../db/idb'
import { expandOccurrences } from '../lib/recurrence'
import { loadRates, FALLBACK_RATES } from '../lib/currency'
import { compressVideo, preloadFFmpeg, VIDEO_SIZE_LIMIT_MB } from '../lib/videoCompression'

interface AppState {
  // Data
  packages: Package[]
  attendance: AttendanceRecord[]
  scheduledClasses: ScheduledClass[]
  videos: VideoRecord[]
  events: DanceEvent[]
  // Auth / Google
  googleToken: string | null
  spreadsheetId: string | null
  pkgSheetId: number
  attSheetId: number
  schedSheetId: number
  videoSheetId: number
  eventsSheetId: number
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
  // Event modal state
  isEventFormOpen: boolean
  editingEvent: DanceEvent | null
  // Tab navigation
  activeTab: 'packages' | 'schedule' | 'settings' | 'analytics'
  // Settings
  autoCompleteClasses: boolean
  monthlyBudget: number | null
  isVideoUploading: boolean
  videoUploadProgress: number  // 0–100
  videoUploadStatus: string
  // Filters
  filterTeacher: string | null
  filterStyle: string | null
  // Pre-filled instructor for new package form (when opening from TeacherDetail)
  prefilledInstructor: string | null
  // Search
  isSearchOpen: boolean

  // Actions
  signIn(token: string): Promise<void>
  setSignInError(msg: string | null): void
  init(token: string, spreadsheetId: string, pkgSheetId: number, attSheetId: number, schedSheetId: number, videoSheetId: number, eventsSheetId: number): Promise<void>
  addPackage(data: Omit<Package, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>): Promise<void>
  updatePackage(id: string, patch: Partial<Package>): Promise<void>
  archivePackage(id: string): Promise<void>
  deletePackage(id: string): Promise<void>
  markAttended(packageId: string): Promise<AttendanceRecord>
  undoLastAttendance(packageId: string): Promise<void>
  deleteAttendance(id: string): Promise<void>
  updateAttendance(id: string, patch: Pick<AttendanceRecord, 'rating' | 'learnedNote' | 'practiceNote'>): Promise<void>
  setDisplayCurrency(c: Currency): Promise<void>
  refreshRates(): Promise<void>
  openForm(pkg?: Package): void
  openFormForTeacher(name: string): void
  closeForm(): void
  setFilterTeacher(name: string | null): void
  setFilterStyle(style: string | null): void
  setActivePackage(id: string | null): void
  // Schedule actions
  addScheduledClass(data: Omit<ScheduledClass, 'id' | 'createdAt' | 'updatedAt' | 'googleCalendarEventId'>, addToCalendar: boolean): Promise<void>
  updateScheduledClass(id: string, patch: Partial<ScheduledClass>, syncCalendar: boolean): Promise<void>
  deleteScheduledClass(id: string): Promise<void>
  openClassForm(cls?: ScheduledClass): void
  closeClassForm(): void
  setActiveTab(tab: 'packages' | 'schedule' | 'settings' | 'analytics'): void
  setAutoCompleteClasses(value: boolean): Promise<void>
  setMonthlyBudget(v: number | null): Promise<void>
  _runAutoComplete(): Promise<void>
  uploadClassVideo(packageId: string, file: File, attendedAt: number, title?: string, notes?: string): Promise<void>
  updateVideo(id: string, patch: { title?: string; notes?: string }): Promise<void>
  deleteVideo(id: string): Promise<void>
  moveVideo(id: string, newPackageId: string, newAttendedAt: number): Promise<void>
  // Search
  setSearchOpen(open: boolean): void
  // Event actions
  addEvent(data: Omit<DanceEvent, 'id' | 'createdAt' | 'updatedAt'>, addToCalendar?: boolean): Promise<void>
  updateEvent(id: string, patch: Partial<DanceEvent>, syncCalendar?: boolean): Promise<void>
  deleteEvent(id: string): Promise<void>
  openEventForm(event?: DanceEvent): void
  closeEventForm(): void
}

// Derived helpers (pure, no store)
export function getUniqueTeachers(packages: Package[]): string[] {
  return [...new Set(packages.map(p => p.instructorName).filter(Boolean))].sort()
}

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

// ── Drive folder helpers ──────────────────────────────────────────────────────

async function getOrCreateFolder(token: string, name: string, parentId?: string): Promise<string> {
  const parentClause = parentId ? ` and '${parentId}' in parents` : " and 'root' in parents"
  const q = encodeURIComponent(
    `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentClause}`
  )
  const listResp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!listResp.ok) throw new Error(`Drive folder search failed ${listResp.status}: ${await listResp.text()}`)
  const list = await listResp.json() as { files?: { id: string }[] }
  if (list.files?.length) return list.files[0].id

  const body: Record<string, unknown> = { name, mimeType: 'application/vnd.google-apps.folder' }
  if (parentId) body.parents = [parentId]
  const createResp = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!createResp.ok) throw new Error(`Drive folder create failed ${createResp.status}: ${await createResp.text()}`)
  const created = await createResp.json() as { id: string }
  if (!created.id) throw new Error('Drive folder create returned no ID')
  return created.id
}

export const useAppStore = create<AppState>((set, get) => ({
  packages: [],
  attendance: [],
  scheduledClasses: [],
  videos: [],
  events: [],
  googleToken: null,
  spreadsheetId: null,
  pkgSheetId: 0,
  attSheetId: 1,
  schedSheetId: 2,
  videoSheetId: 4,
  eventsSheetId: 5,
  displayCurrency: 'CAD',
  rates: FALLBACK_RATES,
  isLoading: false,
  signInError: null,
  isFormOpen: false,
  editingPackage: null,
  activePackageId: null,
  isClassFormOpen: false,
  editingClass: null,
  isEventFormOpen: false,
  editingEvent: null,
  activeTab: 'packages',
  autoCompleteClasses: false,
  monthlyBudget: null,
  isVideoUploading: false,
  videoUploadProgress: 0,
  videoUploadStatus: '',
  filterTeacher: null,
  filterStyle: null,
  prefilledInstructor: null,
  isSearchOpen: false,

  setSignInError(msg) {
    set({ signInError: msg })
  },

  async signIn(token) {
    set({ isLoading: true, signInError: null })
    try {
      const spreadsheetId = await initSpreadsheet(token)
      const { packages: pkgSheetId, attendance: attSheetId, schedule: schedSheetId, videos: videoSheetId, events: eventsSheetId } = await getSheetIds(token, spreadsheetId)
      // Persist session — Google access tokens last ~1 hour
      localStorage.setItem('gsession', JSON.stringify({ token, spreadsheetId, pkgSheetId, attSheetId, schedSheetId, videoSheetId, eventsSheetId, expiresAt: Date.now() + 55 * 60 * 1000 }))
      set({ googleToken: token, spreadsheetId, pkgSheetId, attSheetId, schedSheetId, videoSheetId, eventsSheetId })
      await get().init(token, spreadsheetId, pkgSheetId, attSheetId, schedSheetId, videoSheetId, eventsSheetId)
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

  async init(token, spreadsheetId, pkgSheetId, attSheetId, schedSheetId, videoSheetId, eventsSheetId) {
    set({ isLoading: true })
    const [pkgs, att, schedule, videos, events, cloudSettings, localCurrency, localAutoComplete, localMonthlyBudget, rates] = await Promise.all([
      gsGetPackages(token, spreadsheetId),
      gsGetAttendance(token, spreadsheetId),
      gsGetSchedule(token, spreadsheetId),
      gsGetVideos(token, spreadsheetId),
      gsGetEvents(token, spreadsheetId),
      gsGetSettings(token, spreadsheetId),
      dbGetSetting<Currency>('displayCurrency'),
      dbGetSetting<boolean>('autoCompleteClasses'),
      dbGetSetting<number | null>('monthlyBudget'),
      loadRates(),
    ])

    // Cloud settings win over local IDB; fall back to local then defaults
    const currency = (cloudSettings['displayCurrency'] as Currency | undefined)
      ?? localCurrency ?? 'CAD'
    const autoComplete = (cloudSettings['autoCompleteClasses'] as boolean | undefined)
      ?? localAutoComplete ?? false
    const monthlyBudget = (cloudSettings['monthlyBudget'] as number | null | undefined)
      ?? localMonthlyBudget ?? null
    // Sync cloud values back into IDB so next cold-start is up-to-date
    await Promise.all([
      dbSetSetting('displayCurrency', currency),
      dbSetSetting('autoCompleteClasses', autoComplete),
      dbSetSetting('monthlyBudget', monthlyBudget),
    ])

    set({
      packages: pkgs,
      attendance: att,
      scheduledClasses: schedule,
      videos,
      events,
      pkgSheetId,
      attSheetId,
      schedSheetId,
      videoSheetId,
      eventsSheetId: eventsSheetId ?? 5,
      displayCurrency: currency,
      rates,
      autoCompleteClasses: autoComplete,
      monthlyBudget,
      isLoading: false,
    })
    if (autoComplete) await get()._runAutoComplete()
    // Pre-warm FFmpeg WASM in the background so it's ready when needed
    preloadFFmpeg()
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
      rating: null,
      learnedNote: null,
      practiceNote: null,
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
    set({ isFormOpen: true, editingPackage: pkg ?? null, prefilledInstructor: null })
  },

  openFormForTeacher(name) {
    set({ isFormOpen: true, editingPackage: null, prefilledInstructor: name })
  },

  closeForm() {
    set({ isFormOpen: false, editingPackage: null, prefilledInstructor: null })
  },

  setFilterTeacher(name) {
    set({ filterTeacher: name })
  },

  setFilterStyle(style) {
    set({ filterStyle: style })
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
          rating: null,
          learnedNote: null,
          practiceNote: null,
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

  async uploadClassVideo(packageId, file, attendedAt, title = '', notes = '') {
    const { googleToken, spreadsheetId, packages } = get()
    if (!googleToken || !spreadsheetId) throw new Error('Not signed in')

    const pkg = packages.find(p => p.id === packageId)
    if (!pkg) throw new Error('Package not found')

    set({ isVideoUploading: true, videoUploadProgress: 0, videoUploadStatus: 'Loading compressor…' })

    try {
      // 1. Compress to ≤5 MB
      const compressed = await compressVideo(file, VIDEO_SIZE_LIMIT_MB, pct => {
        set({ videoUploadProgress: Math.round(pct * 0.7), videoUploadStatus: 'Compressing…' })
      })

      set({ videoUploadProgress: 75, videoUploadStatus: 'Uploading to Drive…' })

      // 2. Ensure folder structure: Passinho → {instructor} – {label}
      const appFolderId = await getOrCreateFolder(googleToken, 'Passinho')
      const pkgFolderName = `${pkg.instructorName} – ${pkg.label}`
      const pkgFolderId = await getOrCreateFolder(googleToken, pkgFolderName, appFolderId)

      // 3. Build multipart/related body for Drive upload
      const dateSlug = new Date(attendedAt).toISOString().slice(0, 10)
      const filename = title.trim() ? `${title.trim()}.mp4` : `class-${dateSlug}.mp4`
      const metadata = JSON.stringify({ name: filename, mimeType: 'video/mp4', parents: [pkgFolderId] })
      const boundary = 'dance_planner_boundary'
      const enc = new TextEncoder()
      const metaBytes = enc.encode(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}`
      )
      const mediaHeaderBytes = enc.encode(`\r\n--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`)
      const closeBytes = enc.encode(`\r\n--${boundary}--`)
      const videoBytes = new Uint8Array(await compressed.arrayBuffer())

      const body = new Uint8Array(
        metaBytes.byteLength + mediaHeaderBytes.byteLength + videoBytes.byteLength + closeBytes.byteLength
      )
      let offset = 0
      body.set(metaBytes, offset); offset += metaBytes.byteLength
      body.set(mediaHeaderBytes, offset); offset += mediaHeaderBytes.byteLength
      body.set(videoBytes, offset); offset += videoBytes.byteLength
      body.set(closeBytes, offset)

      set({ videoUploadProgress: 80 })

      // 3. POST to Google Drive
      const uploadResp = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${googleToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        }
      )
      if (!uploadResp.ok) {
        const text = await uploadResp.text()
        throw new Error(`Drive upload failed ${uploadResp.status}: ${text}`)
      }
      const { id: driveFileId, webViewLink: driveWebViewLink } =
        await uploadResp.json() as { id: string; webViewLink: string }

      set({ videoUploadProgress: 95 })

      // 4. Persist VideoRecord to Google Sheets
      const record: VideoRecord = {
        id: crypto.randomUUID(),
        packageId,
        driveFileId,
        driveWebViewLink,
        attendedAt,
        uploadedAt: Date.now(),
        filename,
        sizeBytes: compressed.size,
        title: title.trim(),
        notes: notes.trim(),
      }
      await gsPutVideo(googleToken, spreadsheetId, record)
      set(s => ({ videos: [record, ...s.videos], videoUploadProgress: 100 }))

      toast.success('Video saved to Google Drive!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Upload failed: ${msg.slice(0, 120)}`, { duration: 8000 })
    } finally {
      set({ isVideoUploading: false, videoUploadProgress: 0, videoUploadStatus: '' })
    }
  },

  async updateVideo(id, patch) {
    const { googleToken, spreadsheetId, videos } = get()
    if (!googleToken || !spreadsheetId) return
    const video = videos.find(v => v.id === id)
    if (!video) return

    const updated: VideoRecord = { ...video, ...patch }

    // Rename the Drive file if title changed
    if (patch.title !== undefined && video.driveFileId) {
      const newFilename = patch.title.trim() ? `${patch.title.trim()}.mp4` : video.filename
      updated.filename = newFilename
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${video.driveFileId}?fields=id`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${googleToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newFilename }),
        })
      } catch (err) {
        console.warn('Drive rename failed:', err)
      }
    }

    await gsPutVideo(googleToken, spreadsheetId, updated)
    set(s => ({ videos: s.videos.map(v => v.id === id ? updated : v) }))
  },

  async deleteVideo(id) {
    const { googleToken, spreadsheetId, videoSheetId, videos } = get()
    if (!googleToken || !spreadsheetId) return

    const video = videos.find(v => v.id === id)
    if (video?.driveFileId) {
      try {
        const resp = await fetch(
          `https://www.googleapis.com/drive/v3/files/${video.driveFileId}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${googleToken}` } }
        )
        if (!resp.ok && resp.status !== 404) {
          console.warn(`Drive delete returned ${resp.status}`)
        }
      } catch (err) {
        console.warn('Drive file delete failed:', err)
      }
    }

    await gsDeleteVideo(googleToken, spreadsheetId, videoSheetId, id)
    set(s => ({ videos: s.videos.filter(v => v.id !== id) }))
  },

  async moveVideo(id, newPackageId, newAttendedAt) {
    const { googleToken, spreadsheetId, videos } = get()
    if (!googleToken || !spreadsheetId) return
    const video = videos.find(v => v.id === id)
    if (!video) return
    const updated: VideoRecord = { ...video, packageId: newPackageId, attendedAt: newAttendedAt }
    await gsPutVideo(googleToken, spreadsheetId, updated)
    set(s => ({ videos: s.videos.map(v => v.id === id ? updated : v) }))
    toast.success('Video moved!')
  },

  async updateAttendance(id, patch) {
    const { googleToken: token, spreadsheetId } = get()
    if (!token || !spreadsheetId) return
    const record = get().attendance.find(a => a.id === id)
    if (!record) return
    const updated: AttendanceRecord = { ...record, ...patch }
    await gsPutAttendance(token, spreadsheetId, updated)
    set(s => ({ attendance: s.attendance.map(a => a.id === id ? updated : a) }))
  },

  async setMonthlyBudget(v) {
    await dbSetSetting('monthlyBudget', v)
    set({ monthlyBudget: v })
    const { googleToken: token, spreadsheetId } = get()
    if (token && spreadsheetId) {
      gsPutSetting(token, spreadsheetId, 'monthlyBudget', v).catch(err =>
        console.warn('Failed to sync monthlyBudget to Sheets:', err)
      )
    }
  },

  setSearchOpen(open) {
    set({ isSearchOpen: open })
  },

  async addEvent(data, addToCalendar = false) {
    const { googleToken: token, spreadsheetId } = get()
    if (!token || !spreadsheetId) return
    let googleCalendarEventId: string | null = null
    if (addToCalendar) {
      try {
        googleCalendarEventId = await gcCreateAllDayEvent(token, data)
        toast.success('Added to Google Calendar')
      } catch (err) {
        console.warn('Calendar sync failed:', err)
        toast.error('Could not add to Google Calendar')
      }
    }
    const event: DanceEvent = {
      ...data,
      googleCalendarEventId,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await gsPutEvent(token, spreadsheetId, event)
    set(s => ({ events: [event, ...s.events] }))
  },

  async updateEvent(id, patch, syncCalendar = false) {
    const { googleToken: token, spreadsheetId } = get()
    if (!token || !spreadsheetId) return
    const event = get().events.find(e => e.id === id)
    if (!event) return
    const updated: DanceEvent = { ...event, ...patch, updatedAt: Date.now() }
    if (token && syncCalendar) {
      try {
        if (updated.googleCalendarEventId) {
          await gcUpdateAllDayEvent(token, updated.googleCalendarEventId, updated)
          toast.success('Google Calendar updated')
        } else {
          updated.googleCalendarEventId = await gcCreateAllDayEvent(token, updated)
          toast.success('Added to Google Calendar')
        }
      } catch (err) {
        console.warn('Calendar sync failed:', err)
        toast.error('Could not sync to Google Calendar')
      }
    }
    await gsPutEvent(token, spreadsheetId, updated)
    set(s => ({ events: s.events.map(e => e.id === id ? updated : e) }))
  },

  async deleteEvent(id) {
    const { googleToken: token, spreadsheetId, eventsSheetId } = get()
    if (!token || !spreadsheetId) return
    const event = get().events.find(e => e.id === id)
    if (event?.googleCalendarEventId && token) {
      try { await gcDeleteEvent(token, event.googleCalendarEventId) } catch { /* ignore */ }
    }
    await gsDeleteEvent(token, spreadsheetId, eventsSheetId, id)
    set(s => ({ events: s.events.filter(e => e.id !== id) }))
  },

  openEventForm(event) {
    set({ isEventFormOpen: true, editingEvent: event ?? null })
  },

  closeEventForm() {
    set({ isEventFormOpen: false, editingEvent: null })
  },
}))
