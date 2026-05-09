// RFC 5545 minimal iCal generator — no external deps

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

// Format Date to iCal DATE-TIME in UTC: 20230101T120000Z
function toIcalDate(dateStr: string, timeStr: string): string {
  const [h, m] = timeStr.split(':')
  const d = dateStr.replace(/-/g, '')
  const hh = (h ?? '00').padStart(2, '0')
  const mm = (m ?? '00').padStart(2, '0')
  return `${d}T${hh}${mm}00`
}

export interface IcalShift {
  id: string
  date_iso: string
  start_time: string | null
  end_time: string | null
  role_label: string | null
  notes: string | null
}

export function buildIcal(shifts: IcalShift[], prodId: string): string {
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

    const dtstart = toIcalDate(shift.date_iso, shift.start_time)
    const dtend = toIcalDate(shift.date_iso, shift.end_time)
    const summary = escapeIcal(shift.role_label ?? 'Shift')
    const uid = `${shift.id}@courseday`

    lines.push('BEGIN:VEVENT\r\n')
    lines.push(prop('UID', uid))
    lines.push(prop('DTSTAMP', now + 'Z'))
    lines.push(prop('DTSTART', dtstart))
    lines.push(prop('DTEND', dtend))
    lines.push(prop('SUMMARY', summary))
    if (shift.notes) lines.push(prop('DESCRIPTION', escapeIcal(shift.notes)))
    lines.push('END:VEVENT\r\n')
  }

  lines.push('END:VCALENDAR\r\n')
  return lines.join('')
}
