import { describe, it, expect, vi } from 'vitest'

vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn(() => ({ data: [] })),
  },
}))
vi.mock('exceljs', () => ({
  Workbook: vi.fn().mockImplementation(() => ({
    xlsx: { load: vi.fn().mockResolvedValue(undefined) },
    worksheets: [],
  })),
}))

import { validateRows, parseCSVText } from '@/lib/shift-import'
import Papa from 'papaparse'

const ASSIGNEES = [
  {
    user_id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'jane@example.com',
    display_name: 'Jane',
    job_title: null,
  },
]
const USER_UUID = ASSIGNEES[0]!.user_id

// ── validateRows ──────────────────────────────────────────────────────────────

describe('validateRows', () => {
  it('marks row ok when all fields valid and email known', () => {
    const rows = validateRows(
      [
        {
          date: '2026-05-10',
          start_time: '08:00',
          end_time: '16:00',
          email: 'jane@example.com',
          role: 'Chef',
        },
      ],
      ASSIGNEES
    )
    expect(rows[0]?.status).toBe('ok')
    expect((rows[0] as { user_id: string }).user_id).toBe(USER_UUID)
  })

  it('is case-insensitive for email matching', () => {
    const rows = validateRows(
      [
        {
          date: '2026-05-10',
          start_time: '08:00',
          end_time: '16:00',
          email: 'JANE@EXAMPLE.COM',
          role: '',
        },
      ],
      ASSIGNEES
    )
    expect(rows[0]?.status).toBe('ok')
  })

  it('allows empty role', () => {
    const rows = validateRows(
      [{ date: '2026-05-10', start_time: '', end_time: '', email: 'jane@example.com', role: '' }],
      ASSIGNEES
    )
    expect(rows[0]?.status).toBe('ok')
  })

  it('marks error for unknown email', () => {
    const rows = validateRows(
      [
        {
          date: '2026-05-10',
          start_time: '08:00',
          end_time: '16:00',
          email: 'unknown@x.com',
          role: '',
        },
      ],
      ASSIGNEES
    )
    expect(rows[0]?.status).toBe('error')
    expect((rows[0] as { error: string }).error).toMatch(/unknown email/i)
  })

  it('marks error for missing email', () => {
    const rows = validateRows(
      [{ date: '2026-05-10', start_time: '08:00', end_time: '16:00', email: '', role: '' }],
      ASSIGNEES
    )
    expect(rows[0]?.status).toBe('error')
    expect((rows[0] as { error: string }).error).toMatch(/email/i)
  })

  it('marks error for malformed date', () => {
    const rows = validateRows(
      [
        {
          date: '10/05/2026',
          start_time: '08:00',
          end_time: '16:00',
          email: 'jane@example.com',
          role: '',
        },
      ],
      ASSIGNEES
    )
    expect(rows[0]?.status).toBe('error')
    expect((rows[0] as { error: string }).error).toMatch(/date/i)
  })

  it('marks error for malformed start_time', () => {
    const rows = validateRows(
      [
        {
          date: '2026-05-10',
          start_time: '8am',
          end_time: '16:00',
          email: 'jane@example.com',
          role: '',
        },
      ],
      ASSIGNEES
    )
    expect(rows[0]?.status).toBe('error')
    expect((rows[0] as { error: string }).error).toMatch(/start_time/i)
  })

  it('marks error for malformed end_time', () => {
    const rows = validateRows(
      [
        {
          date: '2026-05-10',
          start_time: '08:00',
          end_time: '4pm',
          email: 'jane@example.com',
          role: '',
        },
      ],
      ASSIGNEES
    )
    expect(rows[0]?.status).toBe('error')
    expect((rows[0] as { error: string }).error).toMatch(/end_time/i)
  })

  it('handles multiple rows with mixed statuses', () => {
    const rows = validateRows(
      [
        {
          date: '2026-05-10',
          start_time: '08:00',
          end_time: '16:00',
          email: 'jane@example.com',
          role: 'Chef',
        },
        {
          date: 'bad-date',
          start_time: '08:00',
          end_time: '16:00',
          email: 'jane@example.com',
          role: '',
        },
      ],
      ASSIGNEES
    )
    expect(rows[0]?.status).toBe('ok')
    expect(rows[1]?.status).toBe('error')
  })
})

// ── parseCSVText ──────────────────────────────────────────────────────────────

describe('parseCSVText', () => {
  it('maps parsed rows to RawImportRow shape', () => {
    vi.mocked(Papa.parse).mockReturnValueOnce({
      data: [
        {
          date: '2026-05-10',
          start_time: '08:00',
          end_time: '16:00',
          email: 'jane@example.com',
          role: 'Chef',
        },
      ],
    } as ReturnType<typeof Papa.parse>)

    const rows = parseCSVText(
      'date,start_time,end_time,email,role\n2026-05-10,08:00,16:00,jane@example.com,Chef'
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      date: '2026-05-10',
      start_time: '08:00',
      end_time: '16:00',
      email: 'jane@example.com',
      role: 'Chef',
    })
  })

  it('returns empty array for empty CSV', () => {
    vi.mocked(Papa.parse).mockReturnValueOnce({ data: [] } as ReturnType<typeof Papa.parse>)
    const rows = parseCSVText('')
    expect(rows).toHaveLength(0)
  })
})
