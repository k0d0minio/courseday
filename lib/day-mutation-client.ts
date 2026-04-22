'use client';

import {
  ackMutation,
  enqueueOfflineMutation,
  getQueueStats,
  getQueuedMutations,
  markMutationFailed,
  markMutationProcessing,
  requeueFailedMutation,
  type OfflineEntity,
  type OfflineOperation,
} from '@/lib/offline-queue';

export type MutationResult<T> =
  | { success: true; data: T; pending: boolean; clientMutationId: string }
  | { success: false; error: string; pending: boolean; clientMutationId: string };

type MutationEnvelope = {
  entity: OfflineEntity;
  operation: OfflineOperation;
  tenantSlug: string;
  dayId: string | null;
  payload: Record<string, unknown>;
  clientMutationId?: string;
};

type QueueEvent =
  | { type: 'queue:updated'; pendingCount: number; failedCount: number }
  | { type: 'queue:sync:start' }
  | { type: 'queue:sync:done' }
  | { type: 'queue:item:failed'; id: string; error: string };

const EVENT_NAME = 'courseday-offline-queue';
const SYNC_TAG = 'drain-offline-queue';

function emit(event: QueueEvent) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: event }));
}

async function notifyStats() {
  const stats = await getQueueStats();
  emit({
    type: 'queue:updated',
    pendingCount: stats.pending,
    failedCount: stats.failed,
  });
}

function routeFor(entity: OfflineEntity) {
  return `/api/mutations/${entity}`;
}

async function postMutation<T>(
  input: Required<Pick<MutationEnvelope, 'clientMutationId'>> & MutationEnvelope
) {
  const response = await fetch(routeFor(input.entity), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const json = (await response.json()) as
    | { success: true; data: T }
    | { success: false; error: string };
  return json;
}

async function registerBackgroundSync() {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('SyncManager' in window)
  ) {
    return;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const syncManager = (
      registration as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      }
    ).sync;
    await syncManager?.register(SYNC_TAG);
  } catch {
    // Browsers without sync permissions fall back to online/visibility listeners.
  }
}

export async function mutateWithOfflineQueue<T>(input: MutationEnvelope): Promise<MutationResult<T>> {
  const clientMutationId = input.clientMutationId ?? crypto.randomUUID();
  const queueRecord = {
    id: crypto.randomUUID(),
    entityType: input.entity,
    operation: input.operation,
    tenantSlug: input.tenantSlug,
    dayId: input.dayId,
    clientMutationId,
    payload: input.payload,
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await enqueueOfflineMutation(queueRecord);
    await notifyStats();
    await registerBackgroundSync();
    return { success: true, data: input.payload as T, pending: true, clientMutationId };
  }

  try {
    const result = await postMutation<T>({ ...input, clientMutationId });
    if (result.success) {
      return { ...result, pending: false, clientMutationId };
    }
    return { success: false, error: result.error, pending: false, clientMutationId };
  } catch {
    await enqueueOfflineMutation(queueRecord);
    await notifyStats();
    await registerBackgroundSync();
    return { success: true, data: input.payload as T, pending: true, clientMutationId };
  }
}

export async function drainOfflineMutationQueue() {
  emit({ type: 'queue:sync:start' });
  const queued = await getQueuedMutations();
  for (const mutation of queued) {
    try {
      await markMutationProcessing(mutation.id);
      const result = await postMutation({
        entity: mutation.entityType,
        operation: mutation.operation,
        payload: mutation.payload,
        tenantSlug: mutation.tenantSlug,
        dayId: mutation.dayId,
        clientMutationId: mutation.clientMutationId,
      });
      if (result.success) {
        await ackMutation(mutation.id);
      } else {
        await markMutationFailed(mutation.id, result.error);
        emit({ type: 'queue:item:failed', id: mutation.id, error: result.error });
      }
    } catch {
      await markMutationFailed(mutation.id, 'Network error while replaying queued change');
      emit({
        type: 'queue:item:failed',
        id: mutation.id,
        error: 'Network error while replaying queued change',
      });
    }
  }
  await notifyStats();
  emit({ type: 'queue:sync:done' });
}

export function subscribeToOfflineQueueEvents(handler: (event: QueueEvent) => void) {
  if (typeof window === 'undefined') return () => undefined;
  const listener = (raw: Event) => {
    const custom = raw as CustomEvent<QueueEvent>;
    if (custom.detail) handler(custom.detail);
  };
  window.addEventListener(EVENT_NAME, listener as EventListener);
  return () => window.removeEventListener(EVENT_NAME, listener as EventListener);
}

export async function refreshOfflineQueueStats() {
  await notifyStats();
}

export async function retryFailedMutation(id: string) {
  await requeueFailedMutation(id);
  await notifyStats();
  await drainOfflineMutationQueue();
}
