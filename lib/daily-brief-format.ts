import type { DailyBriefContent } from '@/types/daily-brief';

export function formatDailyBriefMarkdown(brief: DailyBriefContent): string {
  const lines: string[] = [];
  lines.push(`# ${brief.headline}`);
  lines.push('');
  lines.push(brief.summary);
  lines.push('');
  lines.push('## Covers');
  lines.push(`- Breakfast: ${brief.covers.breakfast}`);
  lines.push(`- Activities: ${brief.covers.activities}`);
  lines.push(`- Reservations: ${brief.covers.reservations}`);
  lines.push('');

  if (brief.vipNotes.length > 0) {
    lines.push('## VIP / priority');
    for (const n of brief.vipNotes) lines.push(`- ${n}`);
    lines.push('');
  }

  if (brief.allergenRollup.length > 0) {
    lines.push('## Allergens');
    for (const a of brief.allergenRollup) {
      const parts = [`**${a.code}**`];
      if (a.inActivities) parts.push(`${a.inActivities} activity slot(s)`);
      if (a.inReservations) parts.push(`${a.inReservations} reservation(s)`);
      if (a.inBreakfast) parts.push(`${a.inBreakfast} breakfast(s)`);
      lines.push(`- ${parts[0]} — ${parts.slice(1).join(', ')}`);
    }
    lines.push('');
  }

  if (brief.risks.length > 0) {
    lines.push('## Risks');
    for (const r of brief.risks) lines.push(`- ${r}`);
    lines.push('');
  }

  if (brief.suggestedActions.length > 0) {
    lines.push('## Suggested actions');
    for (const s of brief.suggestedActions) lines.push(`- ${s}`);
  }

  return lines.join('\n').trim();
}
