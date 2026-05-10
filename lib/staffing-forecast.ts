// Heuristic: 1 staff per 25 expected covers (ceiling). Min 1 if any covers; 0 if all zero.
export function recommendStaffCount(input: {
  activitiesCovers: number
  reservationsCovers: number
  breakfastCovers: number
}): { recommended: number; breakdown: { source: string; count: number }[] } {
  const breakdown = [
    { source: 'activities', count: input.activitiesCovers },
    { source: 'reservations', count: input.reservationsCovers },
    { source: 'breakfast', count: input.breakfastCovers },
  ]
  const total = breakdown.reduce((s, b) => s + b.count, 0)
  if (total === 0) return { recommended: 0, breakdown }
  return { recommended: Math.ceil(total / 25), breakdown }
}
