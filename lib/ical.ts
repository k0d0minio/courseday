// RFC 5545 minimal iCal generator
import { fromZonedTime } from 'date-fns-tz'

function escapeIcal(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

// Fold lines at 75 octets per RFC 5545 §3.1
function foldLine(line: string): string {
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= 75) return line + '\r\n'

  const parts: string[] = []
  let offset = 0
  let first = true
  while (offset < bytes.length) {
    const limit = first ? 75 : 74
    first = false
    // Back up until we're on a valid UTF-8 boundary
    let end = Math.min(offset + limit, bytes.length)
    while (end > offset && end < bytes.length && (bytes[end]! & 0xc0) === 0x80) end--
    parts.push((parts.length > 0 ? ' ' : '') + bytes.slice(offset, end).toString('utf8') + '\r\n')
    offset = end
  }
  return parts.join('')
}

function prop(name: string, value: string): string {
  return foldLine(`${name}:${value}`)
}

// Convert a local date+time in the given IANA timezone to a UTC iCal DATE-TIME: 20230101T120000Z
function toIcalUtc(dateStr: string, timeStr: string, timezone: string): string {
  const [h, m] = timeStr.split(':')
  const hh = (h ?? '00').padStart(2, '0')
  const mm = (m ?? '00').padStart(2, '0')
  const utc = fromZonedTime(`${dateStr}T${hh}:${mm}:00`, timezone)
  return utc
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
  // e.g. "20230101T120000Z"
}

export interface IcalShift {
  id: string
  date_iso: string
  start_time: string | null
  end_time: string | null
  role_label: string | null
  notes: string | null
}

export function buildIcal(shifts: IcalShift[], prodId: string, timezone: string): string {
  // now already ends with "Z", e.g. "20230101T120000Z"
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

  const lines: string[] = [
    'BEGIN:VCALENDAR\r\n',
    prop('VERSION', '2.0'),
    prop('PRODID', escapeIcal(prodId)),
    prop('CALSCALE', 'GREGORIAN'),
    prop('METHOD', 'PUBLISH'),
  ]

  for (const shift of shifts) {
    if (!shift.start_time || !shift.end_time) continue

    const dtstart = toIcalUtc(shift.date_iso, shift.start_time, timezone)
    const dtend = toIcalUtc(shift.date_iso, shift.end_time, timezone)
    const summary = escapeIcal(shift.role_label ?? 'Shift')
    const uid = `${shift.id}@courseday`

    lines.push('BEGIN:VEVENT\r\n')
    lines.push(prop('UID', uid))
    lines.push(prop('DTSTAMP', now))
    lines.push(prop('DTSTART', dtstart))
    lines.push(prop('DTEND', dtend))
    lines.push(prop('SUMMARY', summary))
    if (shift.notes) lines.push(prop('DESCRIPTION', escapeIcal(shift.notes)))
    lines.push('END:VEVENT\r\n')
  }

  lines.push('END:VCALENDAR\r\n')
  return lines.join('')
}
