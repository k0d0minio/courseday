'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PocManagement } from '@/components/poc-management';
import { VenueTypeManagement } from '@/components/venue-type-management';

const TABS = ['poc', 'venue-types'] as const;
type Tab = (typeof TABS)[number];

function isValidTab(v: string | null): v is Tab {
  return TABS.includes(v as Tab);
}

export function SettingsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const raw = searchParams.get('tab');
  const activeTab: Tab = isValidTab(raw) ? raw : 'poc';

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="poc">Points of Contact</TabsTrigger>
          <TabsTrigger value="venue-types">Venue Types</TabsTrigger>
        </TabsList>

        <TabsContent value="poc">
          <PocManagement />
        </TabsContent>

        <TabsContent value="venue-types">
          <VenueTypeManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
