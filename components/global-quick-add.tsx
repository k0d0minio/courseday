'use client'

import { Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { QuickAddInput } from '@/components/quick-add-input'
import { Button } from '@/components/ui/button'
import { useActiveDay } from '@/lib/active-day-context'
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts'

/**
 * Navbar trigger button + QuickAddInput dialog, mounted once in the tenant layout.
 * Open state lives in KeyboardShortcutsContext so the command palette can trigger it too.
 * QuickAddInput handles parse → review → save end-to-end and navigates to the
 * resulting day on commit.
 */
export function GlobalQuickAdd() {
  const t = useTranslations('Tenant.quickAdd')
  const { activeDayYmd } = useActiveDay()
  const { quickAddOpen, setQuickAddOpen } = useKeyboardShortcuts()

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
