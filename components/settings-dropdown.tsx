'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { MenuItem } from '@/components/ui/menu-item'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { useFeatureFlag } from '@/lib/feature-flags-context'

export const SETTINGS_ROUTES = [
  { href: '/admin/settings/poc', labelKey: 'tabPoc' },
  { href: '/admin/settings/staff', labelKey: 'tabStaff' },
  { href: '/admin/settings/venue-types', labelKey: 'tabVenueTypes' },
  { href: '/admin/settings/activity-tags', labelKey: 'tabActivityTags' },
  { href: '/admin/settings/checklists', labelKey: 'tabChecklists' },
  { href: '/admin/settings/branding', labelKey: 'tabBranding' },
  { href: '/admin/settings/language', labelKey: 'tabLanguage' },
  { href: '/admin/settings/members', labelKey: 'tabMembers' },
  { href: '/admin/settings/feedback', labelKey: 'tabFeedback' },
] as const

type LabelKey = (typeof SETTINGS_ROUTES)[number]['labelKey']
type SettingsRoute = (typeof SETTINGS_ROUTES)[number]

export function getVisibleSettingsRoutes(visibility: {
  checklists: boolean
  staffSchedule: boolean
}): SettingsRoute[] {
  let routes = [...SETTINGS_ROUTES]
  if (!visibility.checklists) {
    routes = routes.filter((route) => route.href !== '/admin/settings/checklists')
  }
  if (!visibility.staffSchedule) {
    routes = routes.filter((route) => route.href !== '/admin/settings/staff')
  }
  return routes
}

/** Desktop: gear icon → popover with all settings destinations. */
export function SettingsDropdown() {
  const t = useTranslations('Tenant.settings')
  const navT = useTranslations('Tenant.nav')
  const showChecklists = useFeatureFlag('checklists')
  const showStaffSchedule = useFeatureFlag('staff_schedule')
  const routes = getVisibleSettingsRoutes({
    checklists: showChecklists,
    staffSchedule: showStaffSchedule,
  })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="iconSm"
          className="text-muted-foreground hover:text-foreground"
          aria-label={navT('settings')}
          title={navT('settings')}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1">
        {routes.map(({ href, labelKey }) => (
          <MenuItem key={href} asChild>
            <Link href={href}>{t(labelKey as LabelKey)}</Link>
          </MenuItem>
        ))}
      </PopoverContent>
    </Popover>
  )
}
