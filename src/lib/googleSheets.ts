import type { Package, AttendanceRecord } from '../types'

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

  // Create new spreadsheet with both sheets
  const body = {
    properties: { title: SPREADSHEET_NAME },
    sheets: [
      { properties: { title: 'packages', index: 0 } },
      { properties: { title: 'attendance', index: 1 } },
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

export async function getSheetIds(token: string, spreadsheetId: string): Promise<{ packages: number; attendance: number }> {
  const data = await gFetch(`${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties`, token)
  const sheets = data.sheets as Array<{ properties: { title: string; sheetId: number } }>
  return {
    packages: sheets.find(s => s.properties.title === 'packages')?.properties.sheetId ?? 0,
    attendance: sheets.find(s => s.properties.title === 'attendance')?.properties.sheetId ?? 1,
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
