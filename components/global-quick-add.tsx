'use client'

import { useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { QuickAddInput } from '@/components/quick-add-input'
import { Button } from '@/components/ui/button'
import { useActiveDay } from '@/lib/active-day-context'
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts'
import type { QuickAddParseData } from '@/lib/quick-add-types'

/**
 * Navbar trigger button + QuickAddInput dialog, mounted once in the tenant layout.
 * Open state lives in KeyboardShortcutsContext so the command palette can trigger it too.
 * Parse results are ferried to DayViewClient via ActiveDayContext.pendingQuickAddResult.
 */
export function GlobalQuickAdd() {
  const t = useTranslations('Tenant.quickAdd')
  const router = useRouter()
  const pathname = usePathname()
  const { activeDayYmd } = useActiveDay()
  const { setPendingQuickAddResult } = useActiveDay()
  const { quickAddOpen, setQuickAddOpen } = useKeyboardShortcuts()

  const handleSuccess = useCallback(
    (data: QuickAddParseData, raw: string) => {
      setPendingQuickAddResult({ type: 'success', data, raw })
      const targetPath = `/day/${data.contextDate}`
      if (!pathname.startsWith(targetPath)) {
        router.push(targetPath)
      }
    },
    [pathname, router, setPendingQuickAddResult]
  )

  const handleParseFailed = useCallback(
    (raw: string, error: string) => {
      setPendingQuickAddResult({ type: 'failed', raw, error })
      const targetPath = `/day/${activeDayYmd}`
      if (!pathname.startsWith(targetPath)) {
        router.push(targetPath)
      }
    },
    [activeDayYmd, pathname, router, setPendingQuickAddResult]
  )

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
        onSuccess={handleSuccess}
        onParseFailed={handleParseFailed}
      />
    </>
  )
}
