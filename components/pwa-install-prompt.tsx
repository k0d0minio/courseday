'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed as standalone — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Dismissed this session
    if (sessionStorage.getItem('pwa-prompt-dismissed')) return;

    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !('MSStream' in window);

    if (isIos) {
      setShowIosHint(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem('pwa-prompt-dismissed', '1');
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
    dismiss();
  };

  if (dismissed) return null;

  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-xl border bg-background p-4 shadow-lg sm:left-auto sm:right-4 sm:w-80">
        <Download className="h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Add to Home Screen</p>
          <p className="text-xs text-muted-foreground">Install for quick offline access</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstall}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (showIosHint) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 flex items-start gap-3 rounded-xl border bg-background p-4 shadow-lg sm:left-auto sm:right-4 sm:w-80">
        <Share className="h-5 w-5 shrink-0 text-primary mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Add to Home Screen</p>
          <p className="text-xs text-muted-foreground">
            Tap <Share className="inline h-3 w-3 mx-0.5" /> then &ldquo;Add to Home Screen&rdquo;
          </p>
        </div>
        <button
          onClick={dismiss}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}
