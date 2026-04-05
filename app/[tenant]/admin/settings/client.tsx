'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PocManagement } from '@/components/poc-management';
import { VenueTypeManagement } from '@/components/venue-type-management';
import { ActivityTagManagement } from '@/components/activity-tag-management';
import { MemberManagement } from '@/components/member-management';
import { FeatureRequestManagement } from '@/components/feature-request-management';
import { SettingsForm } from './settings-form';
import { LanguageSettings } from './language-settings';

const TABS = ['poc', 'venue-types', 'activity-tags', 'branding', 'language', 'members', 'feedback'] as const;
type Tab = (typeof TABS)[number];

function isValidTab(v: string | null): v is Tab {
  return TABS.includes(v as Tab);
}

interface SettingsClientProps {
  tenantId: string;
  currentUserId: string;
  initialAccentColor: string | null;
  initialLogoUrl: string | null;
  initialLatitude: number | null;
  initialLongitude: number | null;
}

export function SettingsClient({ tenantId, currentUserId, initialAccentColor, initialLogoUrl, initialLatitude, initialLongitude }: SettingsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('Tenant.settings');

  const raw = searchParams.get('tab');
  const activeTab: Tab = isValidTab(raw) ? raw : 'poc';

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">{t('title')}</h1>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="mb-6 overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-max sm:w-auto">
            <TabsTrigger value="poc">{t('tabPoc')}</TabsTrigger>
            <TabsTrigger value="venue-types">{t('tabVenueTypes')}</TabsTrigger>
            <TabsTrigger value="activity-tags">{t('tabActivityTags')}</TabsTrigger>
            <TabsTrigger value="branding">{t('tabBranding')}</TabsTrigger>
            <TabsTrigger value="language">{t('tabLanguage')}</TabsTrigger>
            <TabsTrigger value="members">{t('tabMembers')}</TabsTrigger>
            <TabsTrigger value="feedback">{t('tabFeedback')}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="poc">
          <PocManagement />
        </TabsContent>

        <TabsContent value="venue-types">
          <VenueTypeManagement />
        </TabsContent>

        <TabsContent value="activity-tags">
          <ActivityTagManagement />
        </TabsContent>

        <TabsContent value="branding">
          <SettingsForm
            tenantId={tenantId}
            initialAccentColor={initialAccentColor}
            initialLogoUrl={initialLogoUrl}
            initialLatitude={initialLatitude}
            initialLongitude={initialLongitude}
          />
        </TabsContent>

        <TabsContent value="language">
          <LanguageSettings />
        </TabsContent>

        <TabsContent value="members">
          <MemberManagement currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="feedback">
          <FeatureRequestManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
