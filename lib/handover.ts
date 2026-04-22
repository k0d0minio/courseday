export type HandoverRowStatus = 'new' | 'edited';

/**
 * Baseline is the user's last_viewed_at on this day. Prefer "new" when both
 * created and updated fall after baseline.
 */
export function handoverRowStatus(
  createdAt: string,
  updatedAt: string,
  baselineIso: string
): HandoverRowStatus | null {
  if (createdAt > baselineIso) return 'new';
  if (updatedAt > baselineIso) return 'edited';
  return null;
}
