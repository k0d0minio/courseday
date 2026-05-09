// Heuristic: 1 staff per 25 expected covers across activities + reservations + breakfasts.
// Round up. Minimum 1 if any covers exist; 0 if all inputs are zero.
export function recommendStaffCount(input: {
  activitiesCovers: number
  reservationsCovers: number
  breakfastCovers: number
}): { recommended: number; breakdown: { source: string; count: number }[] } {
  const total = input.activitiesCovers + input.reservationsCovers + input.breakfastCovers
  if (total === 0) return { recommended: 0, breakdown: [] }
  const breakdown = [
    { source: 'activities', count: input.activitiesCovers },
    { source: 'reservations', count: input.reservationsCovers },
    { source: 'breakfast', count: input.breakfastCovers },
  ].filter((b) => b.count > 0)
  return { recommended: Math.max(1, Math.ceil(total / 25)), breakdown }
}
