import type { Package, AttendanceRecord, ScheduledClass, VideoRecord, DanceEvent, Currency, TeacherClass, Workshop, Inscription } from '../types'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const DRIVE_BASE = 'https://www.googleapis.com/drive/v3/files'
const SPREADSHEET_NAME = 'Dance Planner'

// ── Auth header helper ────────────────────────────────────────────────────────

function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

async function gFetch(url: string, token: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...auth(token),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Google API ${res.status}: ${text}`)
  }
  return res.json()
}

// ── Spreadsheet bootstrap ─────────────────────────────────────────────────────

export async function initSpreadsheet(token: string): Promise<string> {
  // Search Drive for existing spreadsheet
  const query = encodeURIComponent(
    `name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  )
  const list = await gFetch(`${DRIVE_BASE}?q=${query}&fields=files(id,name)`, token)

  if (list.files?.length) {
    return list.files[0].id as string
  }

  // Create new spreadsheet with all nine sheets
  const body = {
    properties: { title: SPREADSHEET_NAME },
    sheets: [
      { properties: { title: 'packages', index: 0 } },
      { properties: { title: 'attendance', index: 1 } },
      { properties: { title: 'schedule', index: 2 } },
      { properties: { title: 'settings', index: 3 } },
      { properties: { title: 'videos', index: 4 } },
      { properties: { title: 'events', index: 5 } },
      { properties: { title: 'teacher_classes', index: 6 } },
      { properties: { title: 'workshops', index: 7 } },
      { properties: { title: 'inscriptions', index: 8 } },
    ],
  }
  const created = await gFetch(SHEETS_BASE, token, { method: 'POST', body: JSON.stringify(body) })
  const spreadsheetId = created.spreadsheetId as string

  // Write header rows
  await gFetch(`${SHEETS_BASE}/${spreadsheetId}/values:batchUpdate`, token, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: [
        {
          range: 'packages!A1:J1',
          values: [['id', 'instructor_name', 'label', 'total_classes', 'price_amount', 'base_currency', 'color', 'created_at', 'updated_at', 'archived_at']],
        },
        {
          range: 'attendance!A1:G1',
          values: [['id', 'package_id', 'attended_at', 'note', 'rating', 'learned_note', 'practice_note']],
        },
        {
          range: 'schedule!A1:K1',
          values: [['id', 'package_id', 'title', 'start_time', 'end_time', 'location', 'recurrence_json', 'google_calendar_event_id', 'notes', 'created_at', 'updated_at']],
        },
        {
          range: 'settings!A1:B1',
          values: [['key', 'value']],
        },
        {
          range: 'videos!A1:J1',
          values: [['id', 'package_id', 'drive_file_id', 'drive_web_view_link', 'attended_at', 'uploaded_at', 'filename', 'size_bytes', 'title', 'notes']],
        },
        {
          range: 'events!A1:L1',
          values: [['id', 'name', 'start_date', 'end_date', 'location', 'cost', 'base_currency', 'styles_json', 'notes', 'google_calendar_event_id', 'created_at', 'updated_at']],
        },
        {
          range: 'teacher_classes!A1:P1',
          values: [['id', 'title', 'style', 'location', 'start_time', 'end_time', 'recurrence_json', 'price_per_student', 'base_currency', 'color', 'notes', 'google_calendar_event_id', 'created_at', 'updated_at', 'archived_at']],
        },
        {
          range: 'workshops!A1:M1',
          values: [['id', 'title', 'style', 'start_date', 'end_date', 'location', 'ticket_price', 'base_currency', 'max_capacity', 'notes', 'google_calendar_event_id', 'created_at', 'updated_at']],
        },
        {
          range: 'inscriptions!A1:K1',
          values: [['id', 'teacher_class_id', 'workshop_id', 'student_name', 'contact_info', 'payment_status', 'amount_paid', 'base_currency', 'notes', 'enrolled_at', 'updated_at']],
        },
      ],
    }),
  })

  return spreadsheetId
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function rowToPkg(row: string[]): Package {
  return {
    id: row[0],
    instructorName: row[1],
    label: row[2],
    totalClasses: Number(row[3]),
    priceAmount: Number(row[4]),
    baseCurrency: row[5] as Package['baseCurrency'],
    color: row[6],
    createdAt: Number(row[7]),
    updatedAt: Number(row[8]),
    archivedAt: row[9] ? Number(row[9]) : null,
  }
}

function pkgToRow(pkg: Package): string[] {
  return [
    pkg.id,
    pkg.instructorName,
    pkg.label,
    String(pkg.totalClasses),
    String(pkg.priceAmount),
    pkg.baseCurrency,
    pkg.color,
    String(pkg.createdAt),
    String(pkg.updatedAt),
    pkg.archivedAt != null ? String(pkg.archivedAt) : '',
  ]
}

function rowToAtt(row: string[]): AttendanceRecord {
  return {
    id: row[0],
    packageId: row[1],
    attendedAt: Number(row[2]),
    note: row[3] || null,
    rating: row[4] ? Number(row[4]) : null,
    learnedNote: row[5] || null,
    practiceNote: row[6] || null,
    title: row[7] || null,
  }
}

function attToRow(att: AttendanceRecord): string[] {
  return [
    att.id,
    att.packageId,
    String(att.attendedAt),
    att.note ?? '',
    att.rating != null ? String(att.rating) : '',
    att.learnedNote ?? '',
    att.practiceNote ?? '',
    att.title ?? '',
  ]
}

// ── Generic sheet helpers ─────────────────────────────────────────────────────

async function getRows(token: string, spreadsheetId: string, sheet: string): Promise<string[][]> {
  const data = await gFetch(`${SHEETS_BASE}/${spreadsheetId}/values/${sheet}`, token)
  const rows: string[][] = data.values ?? []
  return rows.slice(1) // skip header
}

async function findRowIndex(token: string, spreadsheetId: string, sheet: string, id: string): Promise<number> {
  const data = await gFetch(`${SHEETS_BASE}/${spreadsheetId}/values/${sheet}!A:A`, token)
  const col: string[][] = data.values ?? []
  // +1 for 1-based, +1 for header row = index + 2
  return col.findIndex((r, i) => i > 0 && r[0] === id)
}

async function upsertRow(
  token: string,
  spreadsheetId: string,
  sheet: string,
  cols: string,
  row: string[],
  id: string
) {
  const rowIdx = await findRowIndex(token, spreadsheetId, sheet, id)

  if (rowIdx > 0) {
    // Update existing row (1-based, +1 for header)
    const sheetRow = rowIdx + 1
    await gFetch(`${SHEETS_BASE}/${spreadsheetId}/values/${sheet}!A${sheetRow}:${cols}${sheetRow}?valueInputOption=RAW`, token, {
      method: 'PUT',
      body: JSON.stringify({ values: [row] }),
    })
  } else {
    // Append new row
    await gFetch(`${SHEETS_BASE}/${spreadsheetId}/values/${sheet}!A:${cols}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, token, {
      method: 'POST',
      body: JSON.stringify({ values: [row] }),
    })
  }
}

async function deleteRow(token: string, spreadsheetId: string, sheetId: number, sheet: string, id: string) {
  const rowIdx = await findRowIndex(token, spreadsheetId, sheet, id)
  if (rowIdx < 1) return

  // Use batchUpdate to delete the row (0-based for grid range)
  const sheetRow = rowIdx // 0-based (header is 0, so data starts at 1)
  await gFetch(`${SHEETS_BASE}/${spreadsheetId}:batchUpdate`, token, {
    method: 'POST',
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: sheetRow, endIndex: sheetRow + 1 },
        },
      }],
    }),
  })
}

// ── Sheet IDs (needed for row deletion) ──────────────────────────────────────

export async function getSheetIds(
  token: string,
  spreadsheetId: string,
): Promise<{ packages: number; attendance: number; schedule: number; videos: number; events: number; teacherClasses: number; workshops: number; inscriptions: number }> {
  const data = await gFetch(`${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties`, token)
  let sheets = data.sheets as Array<{ properties: { title: string; sheetId: number } }>

  // Provision missing sheets for existing spreadsheets
  const REQUIRED = ['schedule', 'settings', 'videos', 'events', 'teacher_classes', 'workshops', 'inscriptions'] as const
  const missing = REQUIRED.filter(name => !sheets.find(s => s.properties.title === name))

  if (missing.length > 0) {
    await gFetch(`${SHEETS_BASE}/${spreadsheetId}:batchUpdate`, token, {
      method: 'POST',
      body: JSON.stringify({
        requests: missing.map((title, i) => ({
          addSheet: { properties: { title, index: sheets.length + i } },
        })),
      }),
    })
    // Write headers for newly added sheets
    const headerData: { range: string; values: string[][] }[] = []
    if (missing.includes('schedule')) {
      headerData.push({ range: 'schedule!A1:K1', values: [['id', 'package_id', 'title', 'start_time', 'end_time', 'location', 'recurrence_json', 'google_calendar_event_id', 'notes', 'created_at', 'updated_at']] })
    }
    if (missing.includes('settings')) {
      headerData.push({ range: 'settings!A1:B1', values: [['key', 'value']] })
    }
    if (missing.includes('videos')) {
      headerData.push({ range: 'videos!A1:J1', values: [['id', 'package_id', 'drive_file_id', 'drive_web_view_link', 'attended_at', 'uploaded_at', 'filename', 'size_bytes', 'title', 'notes']] })
    }
    if (missing.includes('events')) {
      headerData.push({ range: 'events!A1:K1', values: [['id', 'name', 'start_date', 'end_date', 'location', 'cost', 'base_currency', 'styles_json', 'notes', 'created_at', 'updated_at']] })
    }
    if (missing.includes('teacher_classes')) {
      headerData.push({ range: 'teacher_classes!A1:P1', values: [['id', 'title', 'style', 'location', 'start_time', 'end_time', 'recurrence_json', 'price_per_student', 'base_currency', 'color', 'notes', 'google_calendar_event_id', 'created_at', 'updated_at', 'archived_at']] })
    }
    if (missing.includes('workshops')) {
      headerData.push({ range: 'workshops!A1:M1', values: [['id', 'title', 'style', 'start_date', 'end_date', 'location', 'ticket_price', 'base_currency', 'max_capacity', 'notes', 'google_calendar_event_id', 'created_at', 'updated_at']] })
    }
    if (missing.includes('inscriptions')) {
      headerData.push({ range: 'inscriptions!A1:K1', values: [['id', 'teacher_class_id', 'workshop_id', 'student_name', 'contact_info', 'payment_status', 'amount_paid', 'base_currency', 'notes', 'enrolled_at', 'updated_at']] })
    }
    if (headerData.length > 0) {
      await gFetch(`${SHEETS_BASE}/${spreadsheetId}/values:batchUpdate`, token, {
        method: 'POST',
        body: JSON.stringify({ valueInputOption: 'RAW', data: headerData }),
      })
    }
    // Re-fetch to get updated sheet IDs
    const refreshed = await gFetch(`${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties`, token)
    sheets = refreshed.sheets as Array<{ properties: { title: string; sheetId: number } }>
  }

  return {
    packages: sheets.find(s => s.properties.title === 'packages')?.properties.sheetId ?? 0,
    attendance: sheets.find(s => s.properties.title === 'attendance')?.properties.sheetId ?? 1,
    schedule: sheets.find(s => s.properties.title === 'schedule')?.properties.sheetId ?? 2,
    videos: sheets.find(s => s.properties.title === 'videos')?.properties.sheetId ?? 4,
    events: sheets.find(s => s.properties.title === 'events')?.properties.sheetId ?? 5,
    teacherClasses: sheets.find(s => s.properties.title === 'teacher_classes')?.properties.sheetId ?? 6,
    workshops: sheets.find(s => s.properties.title === 'workshops')?.properties.sheetId ?? 7,
    inscriptions: sheets.find(s => s.properties.title === 'inscriptions')?.properties.sheetId ?? 8,
  }
}

// ── Packages ──────────────────────────────────────────────────────────────────

export async function gsGetPackages(token: string, spreadsheetId: string): Promise<Package[]> {
  const rows = await getRows(token, spreadsheetId, 'packages')
  return rows.filter(r => r[0]).map(rowToPkg).sort((a, b) => b.createdAt - a.createdAt)
}

export async function gsPutPackage(token: string, spreadsheetId: string, pkg: Package): Promise<void> {
  await upsertRow(token, spreadsheetId, 'packages', 'J', pkgToRow(pkg), pkg.id)
}

export async function gsDeletePackage(token: string, spreadsheetId: string, pkgSheetId: number, id: string): Promise<void> {
  await deleteRow(token, spreadsheetId, pkgSheetId, 'packages', id)
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function gsGetAttendance(token: string, spreadsheetId: string): Promise<AttendanceRecord[]> {
  const rows = await getRows(token, spreadsheetId, 'attendance')
  return rows.filter(r => r[0]).map(rowToAtt).sort((a, b) => b.attendedAt - a.attendedAt)
}

export async function gsPutAttendance(token: string, spreadsheetId: string, att: AttendanceRecord): Promise<void> {
  await upsertRow(token, spreadsheetId, 'attendance', 'H', attToRow(att), att.id)
}

export async function gsDeleteAttendance(token: string, spreadsheetId: string, attSheetId: number, id: string): Promise<void> {
  await deleteRow(token, spreadsheetId, attSheetId, 'attendance', id)
}

// ── Schedule ──────────────────────────────────────────────────────────────────

function rowToSchedule(row: string[]): ScheduledClass {
  return {
    id: row[0],
    packageId: row[1] || null,
    title: row[2],
    startTime: Number(row[3]),
    endTime: Number(row[4]),
    location: row[5] || null,
    recurrence: row[6] ? JSON.parse(row[6]) : null,
    googleCalendarEventId: row[7] || null,
    notes: row[8] || null,
    cancelledOccurrences: row[11] ? JSON.parse(row[11]) : [],
    createdAt: Number(row[9]),
    updatedAt: Number(row[10]),
  }
}

function scheduleToRow(cls: ScheduledClass): string[] {
  return [
    cls.id,
    cls.packageId ?? '',
    cls.title,
    String(cls.startTime),
    String(cls.endTime),
    cls.location ?? '',
    cls.recurrence ? JSON.stringify(cls.recurrence) : '',
    cls.googleCalendarEventId ?? '',
    cls.notes ?? '',
    String(cls.createdAt),
    String(cls.updatedAt),
    JSON.stringify(cls.cancelledOccurrences ?? []),
  ]
}

export async function gsGetSchedule(token: string, spreadsheetId: string): Promise<ScheduledClass[]> {
  const rows = await getRows(token, spreadsheetId, 'schedule')
  return rows.filter(r => r[0]).map(rowToSchedule).sort((a, b) => a.startTime - b.startTime)
}

export async function gsPutSchedule(token: string, spreadsheetId: string, cls: ScheduledClass): Promise<void> {
  await upsertRow(token, spreadsheetId, 'schedule', 'L', scheduleToRow(cls), cls.id)
}

export async function gsDeleteSchedule(token: string, spreadsheetId: string, schedSheetId: number, id: string): Promise<void> {
  await deleteRow(token, spreadsheetId, schedSheetId, 'schedule', id)
}

// ── Settings ──────────────────────────────────────────────────────────────────

/** Reads all settings from the sheet. Returns a plain Record of key → parsed value. */
export async function gsGetSettings(token: string, spreadsheetId: string): Promise<Record<string, unknown>> {
  const rows = await getRows(token, spreadsheetId, 'settings')
  const result: Record<string, unknown> = {}
  for (const row of rows) {
    if (!row[0]) continue
    try {
      result[row[0]] = JSON.parse(row[1])
    } catch {
      result[row[0]] = row[1]
    }
  }
  return result
}

/** Upserts a single setting by key. Value is JSON-serialised. */
export async function gsPutSetting(token: string, spreadsheetId: string, key: string, value: unknown): Promise<void> {
  await upsertRow(token, spreadsheetId, 'settings', 'B', [key, JSON.stringify(value)], key)
}

// ── Videos ────────────────────────────────────────────────────────────────────

function rowToVideo(row: string[]): VideoRecord {
  return {
    id: row[0],
    packageId: row[1],
    driveFileId: row[2],
    driveWebViewLink: row[3],
    attendedAt: Number(row[4]),
    uploadedAt: Number(row[5]),
    filename: row[6],
    sizeBytes: Number(row[7]),
    title: row[8] ?? '',
    notes: row[9] ?? '',
  }
}

function videoToRow(v: VideoRecord): string[] {
  return [
    v.id,
    v.packageId,
    v.driveFileId,
    v.driveWebViewLink,
    String(v.attendedAt),
    String(v.uploadedAt),
    v.filename,
    String(v.sizeBytes),
    v.title,
    v.notes,
  ]
}

export async function gsGetVideos(token: string, spreadsheetId: string): Promise<VideoRecord[]> {
  const rows = await getRows(token, spreadsheetId, 'videos')
  return rows.filter(r => r[0]).map(rowToVideo).sort((a, b) => b.uploadedAt - a.uploadedAt)
}

export async function gsPutVideo(token: string, spreadsheetId: string, video: VideoRecord): Promise<void> {
  await upsertRow(token, spreadsheetId, 'videos', 'J', videoToRow(video), video.id)
}

export async function gsDeleteVideo(
  token: string,
  spreadsheetId: string,
  videoSheetId: number,
  id: string,
): Promise<void> {
  await deleteRow(token, spreadsheetId, videoSheetId, 'videos', id)
}

// ── Events ────────────────────────────────────────────────────────────────────

function rowToEvent(row: string[]): DanceEvent {
  // Old format (11 cols): no google_calendar_event_id column.
  // Detect by checking if row[9] looks like an epoch ms timestamp (13-digit number).
  const isOldFormat = !!row[9] && Number(row[9]) > 1_000_000_000_000
  return {
    id: row[0],
    name: row[1],
    startDate: Number(row[2]),
    endDate: row[3] ? Number(row[3]) : null,
    location: row[4] || null,
    cost: row[5] ? Number(row[5]) : null,
    baseCurrency: (row[6] as Currency) || null,
    styles: row[7] ? JSON.parse(row[7]) : [],
    notes: row[8] || null,
    googleCalendarEventId: isOldFormat ? null : (row[9] || null),
    createdAt: isOldFormat ? Number(row[9]) : Number(row[10]),
    updatedAt: isOldFormat ? Number(row[10]) : Number(row[11]),
  }
}

function eventToRow(e: DanceEvent): string[] {
  return [
    e.id,
    e.name,
    String(e.startDate),
    e.endDate != null ? String(e.endDate) : '',
    e.location ?? '',
    e.cost != null ? String(e.cost) : '',
    e.baseCurrency ?? '',
    JSON.stringify(e.styles),
    e.notes ?? '',
    e.googleCalendarEventId ?? '',
    String(e.createdAt),
    String(e.updatedAt),
  ]
}

export async function gsGetEvents(token: string, spreadsheetId: string): Promise<DanceEvent[]> {
  const rows = await getRows(token, spreadsheetId, 'events')
  return rows.filter(r => r[0]).map(rowToEvent).sort((a, b) => b.startDate - a.startDate)
}

export async function gsPutEvent(token: string, spreadsheetId: string, event: DanceEvent): Promise<void> {
  await upsertRow(token, spreadsheetId, 'events', 'L', eventToRow(event), event.id)
}

export async function gsDeleteEvent(
  token: string,
  spreadsheetId: string,
  eventsSheetId: number,
  id: string,
): Promise<void> {
  await deleteRow(token, spreadsheetId, eventsSheetId, 'events', id)
}

// ── TeacherClass ──────────────────────────────────────────────────────────────

function rowToTeacherClass(row: string[]): TeacherClass {
  return {
    id: row[0],
    title: row[1],
    style: row[2],
    location: row[3] || null,
    startTime: Number(row[4]),
    endTime: Number(row[5]),
    recurrence: row[6] ? JSON.parse(row[6]) : null,
    pricePerStudent: row[7] ? Number(row[7]) : null,
    baseCurrency: (row[8] as Currency) || null,
    color: row[9] || '#7c3aed',
    notes: row[10] || null,
    googleCalendarEventId: row[11] || null,
    createdAt: Number(row[12]),
    updatedAt: Number(row[13]),
    archivedAt: row[14] ? Number(row[14]) : null,
  }
}

function teacherClassToRow(tc: TeacherClass): string[] {
  return [
    tc.id,
    tc.title,
    tc.style,
    tc.location ?? '',
    String(tc.startTime),
    String(tc.endTime),
    tc.recurrence ? JSON.stringify(tc.recurrence) : '',
    tc.pricePerStudent != null ? String(tc.pricePerStudent) : '',
    tc.baseCurrency ?? '',
    tc.color,
    tc.notes ?? '',
    tc.googleCalendarEventId ?? '',
    String(tc.createdAt),
    String(tc.updatedAt),
    tc.archivedAt != null ? String(tc.archivedAt) : '',
  ]
}

export async function gsGetTeacherClasses(token: string, spreadsheetId: string): Promise<TeacherClass[]> {
  const rows = await getRows(token, spreadsheetId, 'teacher_classes')
  return rows.filter(r => r[0]).map(rowToTeacherClass).sort((a, b) => b.createdAt - a.createdAt)
}

export async function gsPutTeacherClass(token: string, spreadsheetId: string, tc: TeacherClass): Promise<void> {
  await upsertRow(token, spreadsheetId, 'teacher_classes', 'O', teacherClassToRow(tc), tc.id)
}

export async function gsDeleteTeacherClass(
  token: string,
  spreadsheetId: string,
  sheetId: number,
  id: string,
): Promise<void> {
  await deleteRow(token, spreadsheetId, sheetId, 'teacher_classes', id)
}

// ── Workshop ──────────────────────────────────────────────────────────────────

function rowToWorkshop(row: string[]): Workshop {
  return {
    id: row[0],
    title: row[1],
    style: row[2],
    startDate: Number(row[3]),
    endDate: row[4] ? Number(row[4]) : null,
    location: row[5] || null,
    ticketPrice: row[6] ? Number(row[6]) : null,
    baseCurrency: (row[7] as Currency) || null,
    maxCapacity: row[8] ? Number(row[8]) : null,
    notes: row[9] || null,
    googleCalendarEventId: row[10] || null,
    createdAt: Number(row[11]),
    updatedAt: Number(row[12]),
  }
}

function workshopToRow(w: Workshop): string[] {
  return [
    w.id,
    w.title,
    w.style,
    String(w.startDate),
    w.endDate != null ? String(w.endDate) : '',
    w.location ?? '',
    w.ticketPrice != null ? String(w.ticketPrice) : '',
    w.baseCurrency ?? '',
    w.maxCapacity != null ? String(w.maxCapacity) : '',
    w.notes ?? '',
    w.googleCalendarEventId ?? '',
    String(w.createdAt),
    String(w.updatedAt),
  ]
}

export async function gsGetWorkshops(token: string, spreadsheetId: string): Promise<Workshop[]> {
  const rows = await getRows(token, spreadsheetId, 'workshops')
  return rows.filter(r => r[0]).map(rowToWorkshop).sort((a, b) => b.startDate - a.startDate)
}

export async function gsPutWorkshop(token: string, spreadsheetId: string, w: Workshop): Promise<void> {
  await upsertRow(token, spreadsheetId, 'workshops', 'M', workshopToRow(w), w.id)
}

export async function gsDeleteWorkshop(
  token: string,
  spreadsheetId: string,
  sheetId: number,
  id: string,
): Promise<void> {
  await deleteRow(token, spreadsheetId, sheetId, 'workshops', id)
}

// ── Inscription ───────────────────────────────────────────────────────────────

function rowToInscription(row: string[]): Inscription {
  return {
    id: row[0],
    teacherClassId: row[1] || null,
    workshopId: row[2] || null,
    studentName: row[3],
    contactInfo: row[4] || null,
    paymentStatus: (row[5] as Inscription['paymentStatus']) || 'unpaid',
    amountPaid: row[6] ? Number(row[6]) : null,
    baseCurrency: (row[7] as Currency) || null,
    notes: row[8] || null,
    enrolledAt: Number(row[9]),
    updatedAt: Number(row[10]),
  }
}

function inscriptionToRow(ins: Inscription): string[] {
  return [
    ins.id,
    ins.teacherClassId ?? '',
    ins.workshopId ?? '',
    ins.studentName,
    ins.contactInfo ?? '',
    ins.paymentStatus,
    ins.amountPaid != null ? String(ins.amountPaid) : '',
    ins.baseCurrency ?? '',
    ins.notes ?? '',
    String(ins.enrolledAt),
    String(ins.updatedAt),
  ]
}

export async function gsGetInscriptions(token: string, spreadsheetId: string): Promise<Inscription[]> {
  const rows = await getRows(token, spreadsheetId, 'inscriptions')
  return rows.filter(r => r[0]).map(rowToInscription).sort((a, b) => b.enrolledAt - a.enrolledAt)
}

export async function gsPutInscription(token: string, spreadsheetId: string, ins: Inscription): Promise<void> {
  await upsertRow(token, spreadsheetId, 'inscriptions', 'K', inscriptionToRow(ins), ins.id)
}

export async function gsDeleteInscription(
  token: string,
  spreadsheetId: string,
  sheetId: number,
  id: string,
): Promise<void> {
  await deleteRow(token, spreadsheetId, sheetId, 'inscriptions', id)
}
