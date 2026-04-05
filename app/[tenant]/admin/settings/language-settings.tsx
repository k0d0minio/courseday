'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { useTenant } from '@/lib/tenant-context';
import { updateTenant } from '@/app/actions/tenants';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

export function LanguageSettings() {
  const t = useTranslations('Tenant.settings');
  const { tenantId } = useTenant();
  const currentLocale = useLocale();

  const [selected, setSelected] = useState(currentLocale);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateTenant(tenantId, { language: selected });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t('languageSaved'));
      // Reload to apply new language from updated Redis/headers
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6 max-w-sm">
      <div>
        <h2 className="text-base font-semibold">{t('languageTitle')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('languageDescription')}</p>
      </div>

      <div className="space-y-2">
        <Label>{t('languageLabel')}</Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{t('languageEn')}</SelectItem>
            <SelectItem value="fr">{t('languageFr')}</SelectItem>
            <SelectItem value="es">{t('languageEs')}</SelectItem>
            <SelectItem value="de">{t('languageDe')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSave} disabled={isPending || selected === currentLocale}>
        {isPending ? t('savingLanguage') : t('saveLanguage')}
      </Button>
    </div>
  );
}
