'use client'

import { useRouter } from 'next/navigation'
import { addDays, format, parseISO, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { WeeklyLaborCost } from '@/lib/labor-cost'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

interface Props {
  weekStart: string
  data: WeeklyLaborCost
  basePath: string
}

export function LaborCostWeek({ weekStart, data, basePath }: Props) {
  const t = useTranslations('Tenant.staff.laborCost')
  const router = useRouter()
  const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd')
  const prevWeek = format(subDays(parseISO(weekStart), 7), 'yyyy-MM-dd')
  const nextWeek = format(addDays(parseISO(weekStart), 7), 'yyyy-MM-dd')
  const todayWeek = format(
    parseISO(
      format(
        (() => {
          const d = new Date()
          const day = d.getDay()
          const diff = d.getDate() - day + (day === 0 ? -6 : 1)
          d.setDate(diff)
          return d
        })(),
        'yyyy-MM-dd'
      )
    ),
    'yyyy-MM-dd'
  )

  const hasActuals = data.totalActualCost !== undefined

  return (
    <div className="space-y-6">
      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`${basePath}?week=${prevWeek}`)}
        >
          <ChevronLeft className="size-4" />
          {t('prevWeek')}
        </Button>
        <span className="text-sm font-medium tabular-nums">
          {weekStart} – {weekEnd}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`${basePath}?week=${nextWeek}`)}
        >
          {t('nextWeek')}
          <ChevronRight className="size-4" />
        </Button>
        {weekStart !== todayWeek && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`${basePath}?week=${todayWeek}`)}
          >
            {t('thisWeek')}
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="flex flex-wrap gap-4">
        <Card className="min-w-[12rem] flex-1 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              {t('totalScheduled')}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatMoney(data.totalScheduledCost, data.currency)}
            </p>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {formatMinutes(data.totalScheduledMinutes)}
            </p>
          </CardContent>
        </Card>
        {hasActuals && (
          <Card className="min-w-[12rem] flex-1 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">
                {t('totalActual')}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatMoney(data.totalActualCost!, data.currency)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Per-member table */}
      <Card className="gap-0 overflow-hidden py-0 shadow-sm">
        <CardHeader className="bg-muted/40 border-b px-5 py-4 sm:px-6">
          <CardTitle className="text-base">{t('breakdown')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.perMember.length === 0 ? (
            <p className="text-muted-foreground px-6 py-10 text-center text-sm">{t('noMembers')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-11 min-w-[10rem] pl-6 font-medium">
                      {t('member')}
                    </TableHead>
                    <TableHead className="h-11 w-32 font-medium">{t('scheduledHours')}</TableHead>
                    <TableHead className="h-11 w-36 font-medium">{t('scheduledCost')}</TableHead>
                    {hasActuals && (
                      <>
                        <TableHead className="h-11 w-32 font-medium">{t('actualHours')}</TableHead>
                        <TableHead className="h-11 w-36 pr-6 font-medium">
                          {t('actualCost')}
                        </TableHead>
                      </>
                    )}
                    {!hasActuals && <TableHead className="h-11 pr-6" aria-hidden />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.perMember.map((m) => (
                    <TableRow key={m.user_id} className="hover:bg-muted/40">
                      <TableCell className="py-3 pl-6 font-medium">{m.name}</TableCell>
                      <TableCell className="text-muted-foreground py-3 text-sm tabular-nums">
                        {formatMinutes(m.scheduledMinutes)}
                      </TableCell>
                      <TableCell className="py-3 text-sm tabular-nums">
                        {m.hasRate ? (
                          formatMoney(m.cost, data.currency)
                        ) : (
                          <span className="text-muted-foreground">{t('noRate')}</span>
                        )}
                      </TableCell>
                      {hasActuals && (
                        <>
                          <TableCell className="text-muted-foreground py-3 text-sm tabular-nums">
                            {formatMinutes(m.actualMinutes)}
                          </TableCell>
                          <TableCell className="py-3 pr-6 text-sm tabular-nums">
                            {m.hasRate ? (
                              formatMoney(m.actualCost, data.currency)
                            ) : (
                              <span className="text-muted-foreground">{t('noRate')}</span>
                            )}
                          </TableCell>
                        </>
                      )}
                      {!hasActuals && <TableCell className="pr-6" />}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Compact summary card for the roster page
// ---------------------------------------------------------------------------

interface SummaryCardProps {
  data: WeeklyLaborCost
}

export function LaborCostSummaryCard({ data }: SummaryCardProps) {
  const t = useTranslations('Tenant.staff.laborCost')

  if (data.totalScheduledMinutes === 0 && data.totalScheduledCost === 0) return null

  return (
    <div className="flex flex-wrap gap-3">
      <div className="bg-muted/50 rounded-md px-4 py-2.5">
        <p className="text-muted-foreground text-xs">{t('totalScheduled')}</p>
        <p className="text-sm font-semibold tabular-nums">
          {formatMoney(data.totalScheduledCost, data.currency)}{' '}
          <span className="text-muted-foreground font-normal">
            ({formatMinutes(data.totalScheduledMinutes)})
          </span>
        </p>
      </div>
      {data.totalActualCost !== undefined && (
        <div className="bg-muted/50 rounded-md px-4 py-2.5">
          <p className="text-muted-foreground text-xs">{t('totalActual')}</p>
          <p className="text-sm font-semibold tabular-nums">
            {formatMoney(data.totalActualCost, data.currency)}
          </p>
        </div>
      )}
    </div>
  )
}
