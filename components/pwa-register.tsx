'use client';

import { useEffect } from 'react';
import { drainOfflineMutationQueue, refreshOfflineQueueStats } from '@/lib/day-mutation-client';

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let mounted = true;

    const triggerDrain = () => {
      drainOfflineMutationQueue().catch(() => undefined);
    };

    const onOnline = () => triggerDrain();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') triggerDrain();
    };
    const onPageShow = () => triggerDrain();
    const onSwMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === 'drain-offline-queue') triggerDrain();
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    navigator.serviceWorker.addEventListener('message', onSwMessage);

    navigator.serviceWorker
      .register('/sw.js')
      .then(async (registration) => {
        if (!mounted) return;
        await refreshOfflineQueueStats();
        if ('sync' in registration) {
          try {
            const syncManager = (
              registration as ServiceWorkerRegistration & {
                sync?: { register: (tag: string) => Promise<void> };
              }
            ).sync;
            await syncManager?.register('drain-offline-queue');
          } catch {
            // iOS/Safari path uses event listeners above.
          }
        }
        triggerDrain();
      })
      .catch(console.error);

    return () => {
      mounted = false;
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
      navigator.serviceWorker.removeEventListener('message', onSwMessage);
    };
  }, []);

  return null;
}
