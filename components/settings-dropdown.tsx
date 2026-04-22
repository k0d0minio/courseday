'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

export const SETTINGS_ROUTES = [
  { href: '/admin/settings/poc', labelKey: 'tabPoc' },
  { href: '/admin/settings/venue-types', labelKey: 'tabVenueTypes' },
  { href: '/admin/settings/activity-tags', labelKey: 'tabActivityTags' },
  { href: '/admin/settings/checklists', labelKey: 'tabChecklists' },
  { href: '/admin/settings/branding', labelKey: 'tabBranding' },
  { href: '/admin/settings/language', labelKey: 'tabLanguage' },
  { href: '/admin/settings/members', labelKey: 'tabMembers' },
  { href: '/admin/settings/templates', labelKey: 'tabTemplates' },
  { href: '/admin/settings/feedback', labelKey: 'tabFeedback' },
] as const;

type LabelKey = (typeof SETTINGS_ROUTES)[number]['labelKey'];

/** Desktop: gear icon → popover with all settings destinations. */
export function SettingsDropdown() {
  const t = useTranslations('Tenant.settings');
  const navT = useTranslations('Tenant.nav');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label={navT('settings')}
          title={navT('settings')}
        >
          <Settings className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1">
        {SETTINGS_ROUTES.map(({ href, labelKey }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center rounded px-3 py-2 text-sm hover:bg-accent transition-colors"
          >
            {t(labelKey as LabelKey)}
          </Link>
        ))}
      </PopoverContent>
    </Popover>
  );
}
