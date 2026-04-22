'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  refreshOfflineQueueStats,
  retryFailedMutation,
  subscribeToOfflineQueueEvents,
} from '@/lib/day-mutation-client';

type Status = {
  pendingCount: number;
  failedCount: number;
  syncing: boolean;
};

export function OfflineStatusPill() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [status, setStatus] = useState<Status>({
    pendingCount: 0,
    failedCount: 0,
    syncing: false,
  });

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    refreshOfflineQueueStats().catch(() => undefined);

    const unsubscribe = subscribeToOfflineQueueEvents((event) => {
      if (event.type === 'queue:updated') {
        setStatus((prev) => ({
          ...prev,
          pendingCount: event.pendingCount,
          failedCount: event.failedCount,
        }));
      } else if (event.type === 'queue:sync:start') {
        setStatus((prev) => ({ ...prev, syncing: true }));
      } else if (event.type === 'queue:sync:done') {
        setStatus((prev) => ({ ...prev, syncing: false }));
      } else if (event.type === 'queue:item:failed') {
        toast.error(event.error, {
          action: {
            label: 'Retry',
            onClick: () => retryFailedMutation(event.id).catch(() => undefined),
          },
        });
      }
    });

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      unsubscribe();
    };
  }, []);

  if (online && status.pendingCount === 0 && status.failedCount === 0 && !status.syncing) {
    return null;
  }

  const label = !online
    ? 'Offline'
    : status.syncing
      ? 'Syncing'
      : status.pendingCount > 0
        ? `Pending ${status.pendingCount}`
        : `Failed ${status.failedCount}`;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs text-muted-foreground">
      {!online ? (
        <WifiOff className="h-3 w-3" />
      ) : (
        <RefreshCw className={status.syncing ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} />
      )}
      <span>{label}</span>
    </div>
  );
}
