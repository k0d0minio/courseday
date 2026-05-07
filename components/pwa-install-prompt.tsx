'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return

    if (sessionStorage.getItem('pwa-prompt-dismissed')) return

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !('MSStream' in window)

    if (isIos) {
      setShowIosHint(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    sessionStorage.setItem('pwa-prompt-dismissed', '1')
    setDismissed(true)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
    dismiss()
  }

  if (dismissed) return null

  if (deferredPrompt) {
    return (
      <div className="bg-background fixed right-4 bottom-4 left-4 z-50 flex items-center gap-3 rounded-xl border p-4 shadow-lg sm:right-4 sm:left-auto sm:w-80">
        <Download className="text-primary h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Add to Home Screen</p>
          <p className="text-muted-foreground text-xs">Install for quick offline access</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" onClick={handleInstall}>
            Install
          </Button>
          <Button variant="ghost" size="iconSm" onClick={dismiss} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  if (showIosHint) {
    return (
      <div className="bg-background fixed right-4 bottom-4 left-4 z-50 flex items-start gap-3 rounded-xl border p-4 shadow-lg sm:right-4 sm:left-auto sm:w-80">
        <Share className="text-primary mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Add to Home Screen</p>
          <p className="text-muted-foreground text-xs">
            Tap <Share className="mx-0.5 inline h-3 w-3" /> then &ldquo;Add to Home Screen&rdquo;
          </p>
        </div>
        <Button
          variant="ghost"
          size="iconSm"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return null
}
