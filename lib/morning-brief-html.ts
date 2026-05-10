import { formatDailyBriefMarkdown } from '@/lib/daily-brief-format'
import type { DailyBriefRecord } from '@/types/daily-brief'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export type StaffLine = {
  name: string
  role: string | null
  start_time: string | null
  end_time: string | null
}

export function formatStaffLine(s: StaffLine): string {
  const time =
    s.start_time && s.end_time ? `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}` : null
  const detail = [s.role, time].filter(Boolean).join(' ')
  return detail ? `${s.name} (${detail})` : s.name
}

export function briefToHtml(
  brief: DailyBriefRecord,
  tenantName: string,
  dayUrl: string,
  dateLabel: string,
  staffLines?: StaffLine[]
) {
  const body = formatDailyBriefMarkdown(brief.content, {
    headline_override: brief.headline_override,
    summary_override: brief.summary_override,
  })
    .split('\n')
    .map((line) => {
      if (line.startsWith('# ')) {
        return `<h1 style="font-size:20px;margin:0 0 12px;">${escapeHtml(line.slice(2))}</h1>`
      }
      if (line.startsWith('## ')) {
        return `<h2 style="font-size:15px;margin:20px 0 8px;">${escapeHtml(line.slice(3))}</h2>`
      }
      if (line.trim() === '') return '<br/>'
      if (line.startsWith('- ')) {
        return `<p style="margin:4px 0 4px 12px;">• ${escapeHtml(line.slice(2))}</p>`
      }
      return `<p style="margin:8px 0;">${escapeHtml(line)}</p>`
    })
    .join('')

  const staffSection =
    staffLines && staffLines.length > 0
      ? `<h2 style="font-size:15px;margin:20px 0 8px;">Staff today</h2>${staffLines.map((s) => `<p style="margin:4px 0 4px 12px;">• ${escapeHtml(formatStaffLine(s))}</p>`).join('')}`
      : ''

  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; font-size: 14px; color: #111; max-width: 560px;">
      <p style="color:#555; font-size:13px; margin:0 0 16px;">${escapeHtml(tenantName)} · ${escapeHtml(dateLabel)}</p>
      ${body}
      ${staffSection}
      <p style="margin-top: 24px;"><a href="${escapeHtml(dayUrl)}" style="color: #2563eb;">Open day in ${escapeHtml(tenantName)}</a></p>
    </div>
  `
}
