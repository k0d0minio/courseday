'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getOrCreateIcalToken, rotateIcalToken } from '@/app/actions/ical'
import { toast } from 'sonner'

interface Props {
  initialUrl: string | null
}

export function IcalFeedSection({ initialUrl }: Props) {
  const t = useTranslations('Tenant.staff.icalFeed')
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [copied, setCopied] = useState(false)
  const [rotateOpen, setRotateOpen] = useState(false)
  const [isGenerating, startGenerating] = useTransition()
  const [isRotating, startRotating] = useTransition()

  function handleCopy() {
    if (!url) return
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleGenerate() {
    startGenerating(async () => {
      const result = await getOrCreateIcalToken()
      if (result.success) {
        setUrl(result.data.url)
      } else {
        toast.error(t('errorGenerate'))
      }
    })
  }

  function handleRotate() {
    startRotating(async () => {
      const result = await rotateIcalToken()
      if (result.success) {
        setUrl(result.data.url)
        setRotateOpen(false)
      } else {
        toast.error(t('errorRotate'))
      }
    })
  }

  return (
    <section className="mt-8 rounded-lg border p-4">
      <h2 className="mb-1 text-base font-semibold">{t('title')}</h2>
      <p className="text-muted-foreground mb-4 text-sm">{t('description')}</p>

      {url ? (
        <div className="space-y-3">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              {t('urlLabel')}
            </label>
            <div className="flex gap-2">
              <Input readOnly value={url} className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? t('copied') : t('copy')}
              </Button>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRotateOpen(true)}
            disabled={isRotating}
          >
            {isRotating ? t('rotating') : t('rotate')}
          </Button>
        </div>
      ) : (
        <Button size="sm" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? t('generating') : t('generate')}
        </Button>
      )}

      <AlertDialog open={rotateOpen} onOpenChange={setRotateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rotateConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('rotateConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRotating}>{t('rotateConfirmCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRotate} disabled={isRotating}>
              {isRotating ? t('rotating') : t('rotateConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
