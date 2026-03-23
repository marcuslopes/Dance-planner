import { createClient } from '@supabase/supabase-js'
import type { Package, AttendanceRecord } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey)

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null!

// ── Row mappers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPkg(row: any): Package {
  return {
    id: row.id,
    instructorName: row.instructor_name,
    label: row.label,
    totalClasses: row.total_classes,
    priceAmount: row.price_amount,
    baseCurrency: row.base_currency,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? null,
  }
}

function pkgToRow(pkg: Package) {
  return {
    id: pkg.id,
    instructor_name: pkg.instructorName,
    label: pkg.label,
    total_classes: pkg.totalClasses,
    price_amount: pkg.priceAmount,
    base_currency: pkg.baseCurrency,
    color: pkg.color,
    created_at: pkg.createdAt,
    updated_at: pkg.updatedAt,
    archived_at: pkg.archivedAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAtt(row: any): AttendanceRecord {
  return {
    id: row.id,
    packageId: row.package_id,
    attendedAt: row.attended_at,
    note: row.note ?? null,
  }
}

function attToRow(att: AttendanceRecord) {
  return {
    id: att.id,
    package_id: att.packageId,
    attended_at: att.attendedAt,
    note: att.note,
  }
}

// ── Packages ─────────────────────────────────────────────────────────────────

export async function sbGetPackages(): Promise<Package[]> {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToPkg)
}

export async function sbPutPackage(pkg: Package): Promise<void> {
  const { error } = await supabase.from('packages').upsert(pkgToRow(pkg))
  if (error) throw error
}

export async function sbDeletePackage(id: string): Promise<void> {
  const { error } = await supabase.from('packages').delete().eq('id', id)
  if (error) throw error
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function sbGetAttendance(): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .order('attended_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToAtt)
}

export async function sbPutAttendance(att: AttendanceRecord): Promise<void> {
  const { error } = await supabase.from('attendance').upsert(attToRow(att))
  if (error) throw error
}

export async function sbDeleteAttendance(id: string): Promise<void> {
  const { error } = await supabase.from('attendance').delete().eq('id', id)
  if (error) throw error
}
