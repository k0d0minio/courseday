'use client'

import { useEffect, useState, useTransition, type FormEvent, useId } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { parseQuickAdd } from '@/app/actions/quick-add'
import { ensureDayExists } from '@/app/actions/days'
import type { QuickAddParseData } from '@/lib/quick-add-types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { mutateWithOfflineQueue } from '@/lib/day-mutation-client'
import { useTenant } from '@/lib/tenant-context'
import { QuickAddReview, type QuickAddReviewPayload } from '@/components/quick-add-review'
import {
  QuickAddMultiReview,
  type QuickAddMultiSaveResult,
} from '@/components/quick-add-multi-review'
import type { Activity, BreakfastConfiguration, Reservation } from '@/types/index'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  contextDate: string
  disabled?: boolean
}

type View =
  | { stage: 'input' }
  | { stage: 'review'; data: QuickAddParseData; raw: string }
  | { stage: 'multi-review'; items: QuickAddParseData[]; raw: string }

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(max-width: 639px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

async function savePayload(
  payload: QuickAddReviewPayload,
  tenantSlug: string,
  fallbackContextDate: string
): Promise<QuickAddMultiSaveResult> {
  let dayId = payload.dayId
  if (payload.contextDate !== fallbackContextDate) {
    const ensured = await ensureDayExists(payload.contextDate)
    if (!ensured.success) return { success: false, error: ensured.error }
    dayId = ensured.data.id
  }

  if (payload.kind === 'activity') {
    const result = await mutateWithOfflineQueue<Activity>({
      entity: 'activities',
      operation: 'create',
      tenantSlug,
      dayId,
      payload: {
        dayId,
        title: payload.title,
        startTime: payload.startTime || undefined,
        endTime: payload.endTime || undefined,
        expectedCovers: payload.expectedCovers,
        notes: payload.notes || undefined,
        allergens: payload.allergens.length > 0 ? payload.allergens : undefined,
      },
    })
    if (!result.success) return { success: false, error: result.error }
    return { success: true }
  }
  if (payload.kind === 'reservation') {
    const result = await mutateWithOfflineQueue<Reservation>({
      entity: 'reservations',
      operation: 'create',
      tenantSlug,
      dayId,
      payload: {
        dayId,
        guestName: payload.guestName || undefined,
        guestCount: payload.guestCount,
        startTime: payload.startTime || undefined,
        endTime: payload.endTime || undefined,
        notes: payload.notes || undefined,
        tableBreakdown: payload.tableBreakdown.length > 0 ? payload.tableBreakdown : undefined,
        allergens: payload.allergens.length > 0 ? payload.allergens : undefined,
      },
    })
    if (!result.success) return { success: false, error: result.error }
    return { success: true }
  }
  const result = await mutateWithOfflineQueue<BreakfastConfiguration>({
    entity: 'breakfast',
    operation: 'create',
    tenantSlug,
    dayId,
    payload: {
      dayId,
      groupName: payload.groupName || undefined,
      guestCount: payload.guestCount,
      startTime: payload.startTime || undefined,
      notes: payload.notes || undefined,
      tableBreakdown: payload.tableBreakdown.length > 0 ? payload.tableBreakdown : undefined,
      allergens: payload.allergens.length > 0 ? payload.allergens : undefined,
    },
  })
  if (!result.success) return { success: false, error: result.error }
  return { success: true }
}

export function QuickAddInput({ open, onOpenChange, contextDate, disabled }: Props) {
  const t = useTranslations('Tenant.quickAdd')
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const { tenantSlug } = useTenant()

  const [text, setText] = useState('')
  const [view, setView] = useState<View>({ stage: 'input' })
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isParsing, startParse] = useTransition()
  const [isSaving, startSave] = useTransition()
  const descId = useId()
  const errId = useId()

  // Reset transient state when the dialog/drawer closes. Cascading renders are
  // expected here — the alternative (key-based remount) would interrupt the
  // close animation.

  useEffect(() => {
    if (!open) {
      setText('')
      setView({ stage: 'input' })
      setError(null)
      setSaveError(null)
    }
  }, [open])

  function close() {
    onOpenChange(false)
  }

  function handleParse(e: FormEvent) {
    e.preventDefault()
    const v = text.trim()
    if (!v || isParsing) return
    setError(null)
    startParse(async () => {
      const r = await parseQuickAdd(v, contextDate)
      if (!r.success) {
        setError(r.error)
        return
      }
      const items = r.data.items
      if (items.length > 1) {
        setView({ stage: 'multi-review', items, raw: v })
      } else {
        setView({ stage: 'review', data: items[0]!, raw: v })
      }
    })
  }

  function handleBack() {
    setView({ stage: 'input' })
    setSaveError(null)
  }

  function handleConfirm(payload: QuickAddReviewPayload) {
    if (isSaving) return
    setSaveError(null)
    startSave(async () => {
      const fallback = view.stage === 'review' ? view.data.contextDate : ''
      const result = await savePayload(payload, tenantSlug, fallback)
      if (!result.success) {
        setSaveError(result.error)
        return
      }
      toast.success(t('saved'))
      close()
      const target = `/day/${payload.contextDate}`
      if (!pathname.startsWith(target)) router.push(target)
      else router.refresh()
    })
  }

  function navigateAfterMulti(target: string) {
    close()
    if (!pathname.startsWith(target)) router.push(target)
    else router.refresh()
  }

  async function handleMultiSaveOne(
    payload: QuickAddReviewPayload
  ): Promise<QuickAddMultiSaveResult> {
    return savePayload(payload, tenantSlug, payload.contextDate)
  }

  function handleMultiAllDone() {
    toast.success(t('saved'))
    const dest =
      view.stage === 'multi-review' ? (view.items[0]?.contextDate ?? contextDate) : contextDate
    navigateAfterMulti(`/day/${dest}`)
  }

  const isAiNotConfigured = Boolean(error?.includes('AI is not configured'))

  const inputBody = (
    <form onSubmit={handleParse} className="space-y-3">
      <p id={descId} className="text-muted-foreground text-sm">
        {t('description', { contextDate })}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="quick-add-textarea">{t('inputLabel')}</Label>
        <Textarea
          id="quick-add-textarea"
          className="min-h-[100px] resize-y"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          placeholder={t('placeholder')}
          disabled={isParsing || disabled}
          aria-invalid={error ? true : undefined}
          aria-errormessage={error ? errId : undefined}
        />
        {error && (
          <p id={errId} role="alert" className="text-destructive text-sm">
            {error}
            {isAiNotConfigured && (
              <>
                {' '}
                <Link href="/admin/settings" className="underline" onClick={close}>
                  Go to settings
                </Link>
              </>
            )}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={close} disabled={isParsing}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isParsing || !text.trim() || disabled}>
          {isParsing ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              {t('parsing')}
            </>
          ) : (
            t('submit')
          )}
        </Button>
      </div>
    </form>
  )

  const reviewBody =
    view.stage === 'review' ? (
      <QuickAddReview
        data={view.data}
        rawText={view.raw}
        onConfirm={handleConfirm}
        onBack={handleBack}
        isPending={isSaving}
        error={saveError}
      />
    ) : view.stage === 'multi-review' ? (
      <QuickAddMultiReview
        items={view.items}
        onSaveOne={handleMultiSaveOne}
        onAllDone={handleMultiAllDone}
        onBack={handleBack}
      />
    ) : null

  const title =
    view.stage === 'input'
      ? t('title')
      : view.stage === 'multi-review'
        ? t('multiReviewTitle')
        : t('reviewTitle')

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(o) => {
          if (!o) onOpenChange(false)
          else onOpenChange(true)
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {title}
            </DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[75vh] overflow-y-auto px-4 pb-6">
            {view.stage === 'input' ? inputBody : reviewBody}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onOpenChange(false)
        else onOpenChange(true)
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-md"
        aria-describedby={view.stage === 'input' ? descId : undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>
        {view.stage === 'input' ? inputBody : reviewBody}
      </DialogContent>
    </Dialog>
  )
}
