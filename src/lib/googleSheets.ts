import type { Package, AttendanceRecord, ScheduledClass, VideoRecord } from '../types'

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

  // Create new spreadsheet with all five sheets
  const body = {
    properties: { title: SPREADSHEET_NAME },
    sheets: [
      { properties: { title: 'packages', index: 0 } },
      { properties: { title: 'attendance', index: 1 } },
      { properties: { title: 'schedule', index: 2 } },
      { properties: { title: 'settings', index: 3 } },
      { properties: { title: 'videos', index: 4 } },
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
          range: 'attendance!A1:D1',
          values: [['id', 'package_id', 'attended_at', 'note']],
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
  }
}

function attToRow(att: AttendanceRecord): string[] {
  return [att.id, att.packageId, String(att.attendedAt), att.note ?? '']
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
): Promise<{ packages: number; attendance: number; schedule: number; videos: number }> {
  const data = await gFetch(`${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties`, token)
  let sheets = data.sheets as Array<{ properties: { title: string; sheetId: number } }>

  // Provision missing sheets for existing spreadsheets
  const REQUIRED = ['schedule', 'settings', 'videos'] as const
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
  await upsertRow(token, spreadsheetId, 'attendance', 'D', attToRow(att), att.id)
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
  ]
}

export async function gsGetSchedule(token: string, spreadsheetId: string): Promise<ScheduledClass[]> {
  const rows = await getRows(token, spreadsheetId, 'schedule')
  return rows.filter(r => r[0]).map(rowToSchedule).sort((a, b) => a.startTime - b.startTime)
}

export async function gsPutSchedule(token: string, spreadsheetId: string, cls: ScheduledClass): Promise<void> {
  await upsertRow(token, spreadsheetId, 'schedule', 'K', scheduleToRow(cls), cls.id)
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
