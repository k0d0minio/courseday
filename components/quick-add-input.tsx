'use client'

import { useState, useTransition, type FormEvent, useId } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { parseQuickAdd } from '@/app/actions/quick-add'
import type { QuickAddParseData } from '@/lib/quick-add-types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  contextDate: string
  onSuccess: (data: QuickAddParseData, raw: string) => void
  /** Kept for API compatibility; no longer invoked — errors are shown inline. */
  onParseFailed?: (raw: string, errorMessage: string) => void
  disabled?: boolean
}

export function QuickAddInput({ open, onOpenChange, contextDate, onSuccess, disabled }: Props) {
  const t = useTranslations('Tenant.quickAdd')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const descId = useId()
  const errId = useId()

  function close() {
    onOpenChange(false)
    setText('')
    setError(null)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const v = text.trim()
    if (!v || isPending) return
    setError(null)
    startTransition(async () => {
      const r = await parseQuickAdd(v, contextDate)
      if (!r.success) {
        setError(r.error)
        return
      }
      onSuccess(r.data, v)
      close()
    })
  }

  const isAiNotConfigured = Boolean(error?.includes('AI is not configured'))

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onOpenChange(false)
          setText('')
          setError(null)
        } else onOpenChange(true)
      }}
    >
      <DialogContent className="sm:max-w-md" aria-describedby={descId}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>
        <p id={descId} className="text-muted-foreground text-sm">
          {t('description', { contextDate })}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
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
              disabled={isPending || disabled}
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
            <Button type="button" variant="outline" onClick={close} disabled={isPending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending || !text.trim() || disabled}>
              {isPending ? (
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
      </DialogContent>
    </Dialog>
  )
}
