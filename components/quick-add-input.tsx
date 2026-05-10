'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent, useId } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { ensureDayExists } from '@/app/actions/days'
import { quickAddLlmSchema, buildDataFromLlm } from '@/lib/quick-add-build'
import type { QuickAddParseData } from '@/lib/quick-add-types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { mutateWithOfflineQueue } from '@/lib/day-mutation-client'
import { useTenant } from '@/lib/tenant-context'
import { QuickAddReview, type QuickAddReviewPayload } from '@/components/quick-add-review'
import { QuickAddStreamingPreview } from '@/components/quick-add-streaming-preview'
import type { Activity, BreakfastConfiguration, Reservation } from '@/types/index'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  contextDate: string
  disabled?: boolean
}

type View =
  | { stage: 'input' }
  | { stage: 'streaming' }
  | { stage: 'review'; data: QuickAddParseData; raw: string }

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
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
  const [isSaving, startSave] = useTransition()
  const descId = useId()
  const errId = useId()

  // dayId is resolved client-side via ensureDayExists before the stream is
  // submitted, so it's available when buildDataFromLlm runs on finish.
  const dayIdRef = useRef<string | null>(null)
  // Capture the raw input at submit time so it survives the user editing the
  // textarea while the stream is in flight.
  const submittedTextRef = useRef<string>('')

  const {
    object: streamObj,
    submit: submitStream,
    isLoading,
    error: streamError,
    stop: stopStream,
  } = useObject({
    api: '/api/quick-add/stream',
    schema: quickAddLlmSchema,
    onFinish({ object }: { object: unknown }) {
      const parsed = quickAddLlmSchema.safeParse(object)
      const dayId = dayIdRef.current
      if (!parsed.success || !dayId) {
        setView({ stage: 'input' })
        if (!error) setError(t('parseFailed'))
        return
      }
      const data = buildDataFromLlm(parsed.data, dayId, contextDate)
      setView({ stage: 'review', data, raw: submittedTextRef.current })
    },
    onError(err: Error) {
      setError(err?.message || t('parseFailed'))
      setView({ stage: 'input' })
    },
  })

  useEffect(() => {
    if (!open) {
      setText('')
      setView({ stage: 'input' })
      setError(null)
      setSaveError(null)
      dayIdRef.current = null
      submittedTextRef.current = ''
      if (isLoading) stopStream()
    }
    // We intentionally do not depend on isLoading/stopStream — only run on close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function close() {
    onOpenChange(false)
  }

  async function handleParse(e: FormEvent) {
    e.preventDefault()
    const v = text.trim()
    if (!v || isLoading) return
    setError(null)
    dayIdRef.current = null
    submittedTextRef.current = v
    setView({ stage: 'streaming' })

    // Resolve dayId up-front so buildDataFromLlm has it on stream finish.
    const ensured = await ensureDayExists(contextDate)
    if (!ensured.success) {
      setError(ensured.error)
      setView({ stage: 'input' })
      return
    }
    dayIdRef.current = ensured.data.id
    submitStream({ input: v, contextDate })
  }

  function handleBack() {
    setView({ stage: 'input' })
    setSaveError(null)
  }

  function handleConfirm(payload: QuickAddReviewPayload) {
    if (isSaving) return
    setSaveError(null)
    startSave(async () => {
      // If user changed the date (via the dateAmbiguous picker), resolve a new dayId.
      let dayId = payload.dayId
      if (payload.contextDate !== (view.stage === 'review' ? view.data.contextDate : '')) {
        const ensured = await ensureDayExists(payload.contextDate)
        if (!ensured.success) {
          setSaveError(ensured.error)
          return
        }
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
        if (!result.success) {
          setSaveError(result.error)
          return
        }
      } else if (payload.kind === 'reservation') {
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
        if (!result.success) {
          setSaveError(result.error)
          return
        }
      } else {
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
        if (!result.success) {
          setSaveError(result.error)
          return
        }
      }

      toast.success(t('saved'))
      close()
      const target = `/day/${payload.contextDate}`
      if (!pathname.startsWith(target)) router.push(target)
      else router.refresh()
    })
  }

  // Surface stream errors to the inline error region.
  useEffect(() => {
    if (streamError && !error) {
      setError(streamError.message || t('parseFailed'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamError])

  const isAiNotConfigured = Boolean(error?.includes('AI is not configured'))
  const isParsing = view.stage === 'streaming'
  // Spinner only until the first token arrives.
  const showSpinner = isParsing && !streamObj

  const inputBody = (
    <form
      onSubmit={(e) => {
        void handleParse(e)
      }}
      className="space-y-3"
    >
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

  const streamingBody =
    view.stage === 'streaming' ? (
      <div className="space-y-3">
        {showSpinner ? (
          <div
            className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('parsing')}
          </div>
        ) : (
          <QuickAddStreamingPreview partial={streamObj} label={t('parsing')} />
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              stopStream()
              setView({ stage: 'input' })
            }}
          >
            {t('cancel')}
          </Button>
        </div>
      </div>
    ) : null

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
    ) : null

  const title = view.stage === 'input' || view.stage === 'streaming' ? t('title') : t('reviewTitle')

  const body =
    view.stage === 'input' ? inputBody : view.stage === 'streaming' ? streamingBody : reviewBody

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
          <div className="max-h-[75vh] overflow-y-auto px-4 pb-6">{body}</div>
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
        {body}
      </DialogContent>
    </Dialog>
  )
}
