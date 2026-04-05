'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISSED_KEY = 'onboarding-banner-dismissed';

export function OnboardingBanner() {
  const t = useTranslations('Tenant.onboarding');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-6 py-3 flex items-center justify-between gap-4">
      <p className="text-sm">
        {t('bannerText')}{' '}
        <Link href="/admin/onboarding" className="font-medium underline underline-offset-2">
          {t('bannerLink')}
        </Link>
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={dismiss}
        aria-label={t('bannerDismiss')}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
