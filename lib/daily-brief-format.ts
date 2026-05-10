import type { DailyBriefContent } from '@/types/daily-brief'

export type DailyBriefOverrides = {
  headline_override?: string | null
  summary_override?: string | null
}

/**
 * Markdown rendering for clipboard copy + cron emails. Editor overrides
 * (when present) replace the AI-generated headline / summary so external
 * recipients always see the human-curated wording.
 */
export function formatDailyBriefMarkdown(
  brief: DailyBriefContent,
  overrides?: DailyBriefOverrides
): string {
  const headline = overrides?.headline_override?.trim() || brief.headline
  const summary = overrides?.summary_override?.trim() || brief.summary
  const lines: string[] = []
  lines.push(`# ${headline}`)
  lines.push('')
  lines.push(summary)
  lines.push('')
  lines.push('## Covers')
  lines.push(`- Breakfast: ${brief.covers.breakfast}`)
  lines.push(`- Activities: ${brief.covers.activities}`)
  lines.push(`- Reservations: ${brief.covers.reservations}`)
  lines.push('')

  if (brief.vipNotes.length > 0) {
    lines.push('## VIP / priority')
    for (const n of brief.vipNotes) lines.push(`- ${n}`)
    lines.push('')
  }

  if (brief.allergenRollup.length > 0) {
    lines.push('## Allergens')
    for (const a of brief.allergenRollup) {
      const parts = [`**${a.code}**`]
      if (a.inActivities) parts.push(`${a.inActivities} activity slot(s)`)
      if (a.inReservations) parts.push(`${a.inReservations} reservation(s)`)
      if (a.inBreakfast) parts.push(`${a.inBreakfast} breakfast(s)`)
      lines.push(`- ${parts[0]} — ${parts.slice(1).join(', ')}`)
    }
    lines.push('')
  }

  if (brief.risks.length > 0) {
    lines.push('## Risks')
    for (const r of brief.risks) lines.push(`- ${r}`)
    lines.push('')
  }

  if (brief.suggestedActions.length > 0) {
    lines.push('## Suggested actions')
    for (const s of brief.suggestedActions) lines.push(`- ${s}`)
  }

  return lines.join('\n').trim()
}
