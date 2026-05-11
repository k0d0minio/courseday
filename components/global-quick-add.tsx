'use client'

import { Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { QuickAddInput } from '@/components/quick-add-input'
import { Button } from '@/components/ui/button'
import { useActiveDay } from '@/lib/active-day-context'
import { useQuickAdd } from '@/lib/quick-add-context'

export function GlobalQuickAdd() {
  const t = useTranslations('Tenant.quickAdd')
  const { activeDayYmd } = useActiveDay()
  const { quickAddOpen, setQuickAddOpen } = useQuickAdd()

  return (
    <>
      <Button
        variant="ghost"
        size="iconSm"
        aria-label={t('openButton')}
        onClick={() => setQuickAddOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
      </Button>
      <QuickAddInput
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        contextDate={activeDayYmd}
      />
    </>
  )
}
