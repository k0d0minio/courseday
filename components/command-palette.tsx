'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { format, parseISO } from 'date-fns'
import { CalendarIcon, CornerDownLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { signOut } from '@/app/actions/auth'
import { useAuth } from '@/lib/AuthProvider'
import { useActiveDay } from '@/lib/active-day-context'
import { useFeatureFlag } from '@/lib/feature-flags-context'
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts'
import { maxDayYmd } from '@/lib/day-navigation'
import { modKeyLabel } from '@/lib/mod-key'
import { getVisibleSettingsRoutes } from '@/components/settings-dropdown'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CommandPalette() {
  const t = useTranslations('Tenant.shortcuts')
  const tSettings = useTranslations('Tenant.settings')
  const tNav = useTranslations('Tenant.nav')
  const router = useRouter()
  const { tenantTodayYmd, activeDayYmd } = useActiveDay()
  const { isEditor } = useAuth()
  const showChecklists = useFeatureFlag('checklists')
  const showStaffSchedule = useFeatureFlag('staff_schedule')
  const showReservations = useFeatureFlag('reservations')
  const showBreakfast = useFeatureFlag('breakfast_config')
  const { commandPaletteOpen, setCommandPaletteOpen, setQuickAddOpen } = useKeyboardShortcuts()

  const [datePickOpen, setDatePickOpen] = useState(false)

  const settingsRoutes = useMemo(
    () =>
      getVisibleSettingsRoutes({
        checklists: showChecklists,
        staffSchedule: showStaffSchedule,
      }),
    [showChecklists, showStaffSchedule]
  )

  const close = useCallback(() => {
    setCommandPaletteOpen(false)
    setDatePickOpen(false)
  }, [setCommandPaletteOpen])

  function goDay(ymd: string) {
    router.push(`/day/${ymd}`)
    close()
  }

  function openNewOnDay(kind: 'activity' | 'reservation' | 'breakfast') {
    const q = new URLSearchParams()
    q.set('create', kind)
    router.push(`/day/${activeDayYmd}?${q.toString()}`)
    close()
  }

  function openQuickAdd() {
    close()
    setQuickAddOpen(true)
  }

  function handleSignOut() {
    close()
    void signOut()
  }

  const mod = modKeyLabel()

  return (
    <Dialog
      open={commandPaletteOpen}
      onOpenChange={(o) => {
        setCommandPaletteOpen(o)
        if (!o) setDatePickOpen(false)
      }}
    >
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{t('paletteTitle')}</DialogTitle>
        {datePickOpen ? (
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t('goToDate')}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDatePickOpen(false)}
              >
                {t('back')}
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={parseISO(activeDayYmd)}
              onSelect={(d) => {
                if (d) {
                  goDay(format(d, 'yyyy-MM-dd'))
                }
              }}
              disabled={(d) => {
                const ymd = format(d, 'yyyy-MM-dd')
                const upper = maxDayYmd(tenantTodayYmd)
                return ymd < tenantTodayYmd || ymd > upper
              }}
            />
          </div>
        ) : (
          <Command
            className={cn(
              'rounded-lg border-none shadow-none',
              '[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium',
              '[&_[cmdk-group]]:px-1 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0',
              '[&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4',
              '[&_[cmdk-input]]:h-12 [&_[cmdk-input]]:border-none [&_[cmdk-input]]:px-3',
              '[&_[cmdk-item]]:rounded-md [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2',
              '[&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4'
            )}
            loop
            shouldFilter
          >
            <div className="flex items-center border-b px-2" cmdk-input-wrapper="">
              <CornerDownLeft className="text-muted-foreground mr-2 shrink-0 opacity-50" />
              <Command.Input
                placeholder={t('palettePlaceholder', { mod })}
                aria-label={t('paletteAria')}
                className="placeholder:text-muted-foreground flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Command.List className="max-h-[min(60vh,320px)] overflow-y-auto p-1">
              <Command.Empty className="text-muted-foreground py-6 text-center text-sm">
                {t('paletteEmpty')}
              </Command.Empty>

              <Command.Group heading={t('groupNavigate')}>
                <Command.Item
                  value={`today-jump-${t('cmdGoToday')}`}
                  onSelect={() => {
                    goDay(tenantTodayYmd)
                  }}
                >
                  {t('cmdGoToday')}
                </Command.Item>
                <Command.Item
                  value={`date-pick-${t('goToDate')}`}
                  onSelect={() => setDatePickOpen(true)}
                >
                  <CalendarIcon className="text-muted-foreground mr-2" />
                  {t('goToDate')}
                </Command.Item>
                <Command.Item
                  value={`home-${t('cmdHome')}`}
                  onSelect={() => {
                    router.push('/')
                    close()
                  }}
                >
                  {t('cmdHome')}
                </Command.Item>
              </Command.Group>

              {isEditor && (
                <Command.Group heading={t('groupCreate')}>
                  <Command.Item value="quick-add" onSelect={openQuickAdd}>
                    {t('cmdQuickAdd')}
                  </Command.Item>
                  <Command.Item value="new-activity" onSelect={() => openNewOnDay('activity')}>
                    {t('cmdNewActivity')}
                  </Command.Item>
                  {showReservations && (
                    <Command.Item
                      value="new-reservation"
                      onSelect={() => openNewOnDay('reservation')}
                    >
                      {t('cmdNewReservation')}
                    </Command.Item>
                  )}
                  {showBreakfast && (
                    <Command.Item value="new-breakfast" onSelect={() => openNewOnDay('breakfast')}>
                      {t('cmdNewBreakfast')}
                    </Command.Item>
                  )}
                </Command.Group>
              )}

              {isEditor && (
                <Command.Group heading={t('groupSettings')}>
                  {settingsRoutes.map(({ href, labelKey }) => (
                    <Command.Item
                      key={href}
                      value={`settings-${href}-${labelKey}`}
                      onSelect={() => {
                        router.push(href)
                        close()
                      }}
                    >
                      {tSettings(labelKey as 'tabPoc')}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              <Command.Group heading={t('groupSession')}>
                <Command.Item value="sign-out" onSelect={handleSignOut}>
                  {tNav('signOut')}
                </Command.Item>
              </Command.Group>
            </Command.List>
            <div className="text-muted-foreground border-t px-3 py-2 text-[10px]">
              {t('paletteFooter', { mod })}
            </div>
          </Command>
        )}
      </DialogContent>
    </Dialog>
  )
}
