'use client'

import { useTranslations } from 'next-intl'

type Props = {
  breakdown: number[]
}

export function TableBreakdownDisplay({ breakdown }: Props) {
  const t = useTranslations('Tenant.tableBreakdown')
  if (breakdown.length === 0) return null
  const total = breakdown.reduce((s, n) => s + n, 0)
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {breakdown.map((seats, i) => (
          <span
            key={i}
            className="bg-muted inline-flex min-w-[1.75rem] items-center justify-center rounded-md border px-2 py-1 text-xs font-medium"
          >
            {seats}
          </span>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        {t('summary', { count: breakdown.length, covers: total })}
      </p>
    </div>
  )
}
