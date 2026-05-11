import Papa from 'papaparse'
import * as ExcelJS from 'exceljs'
import type { ShiftAssignee } from '@/types/index'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export type RawImportRow = {
  date: string
  start_time: string
  end_time: string
  email: string
  role: string
}

type BaseImportRow = {
  date: string
  start_time: string
  end_time: string
  email: string
  role: string
}

export type ValidatedImportRow =
  | (BaseImportRow & { status: 'ok'; user_id: string })
  | (BaseImportRow & { status: 'error'; error: string })

export function validateRows(
  rows: RawImportRow[],
  assignees: ShiftAssignee[]
): ValidatedImportRow[] {
  const emailMap = new Map(
    assignees.map((a): [string, ShiftAssignee] => [a.email.toLowerCase(), a])
  )

  return rows.map((raw) => {
    const base = {
      date: raw.date,
      start_time: raw.start_time,
      end_time: raw.end_time,
      email: raw.email,
      role: raw.role,
    }

    if (!raw.date || !DATE_RE.test(raw.date)) {
      return { ...base, status: 'error' as const, error: 'Invalid date (expected YYYY-MM-DD)' }
    }
    if (raw.start_time && !TIME_RE.test(raw.start_time)) {
      return { ...base, status: 'error' as const, error: 'Invalid start_time (expected HH:MM)' }
    }
    if (raw.end_time && !TIME_RE.test(raw.end_time)) {
      return { ...base, status: 'error' as const, error: 'Invalid end_time (expected HH:MM)' }
    }
    if (!raw.email) {
      return { ...base, status: 'error' as const, error: 'Email is required' }
    }
    const assignee = emailMap.get(raw.email.toLowerCase())
    if (!assignee) {
      return { ...base, status: 'error' as const, error: `Unknown email: ${raw.email}` }
    }
    return { ...base, status: 'ok' as const, user_id: assignee.user_id }
  })
}

export function parseCSVText(text: string): RawImportRow[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.toLowerCase().trim(),
  })
  return result.data.map(normaliseRow)
}

export async function parseXLSXBuffer(buffer: ArrayBuffer): Promise<RawImportRow[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as Buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const headers: string[] = []
  const rows: RawImportRow[] = []

  sheet.eachRow((row, rowNumber) => {
    const values = (row.values as unknown[]).slice(1)
    if (rowNumber === 1) {
      headers.push(
        ...values.map((v) =>
          String(v ?? '')
            .toLowerCase()
            .trim()
        )
      )
      return
    }
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => {
      obj[h] = String(values[i] ?? '').trim()
    })
    rows.push(normaliseRow(obj))
  })

  return rows
}

function normaliseRow(obj: Record<string, string>): RawImportRow {
  const get = (key: string) => (obj[key] ?? '').toString().trim()
  return {
    date: get('date'),
    start_time: get('start_time'),
    end_time: get('end_time'),
    email: get('email'),
    role: get('role'),
  }
}
