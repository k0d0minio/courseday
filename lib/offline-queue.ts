'use client';

export type OfflineEntity = 'activities' | 'reservations' | 'breakfast' | 'day-notes';
export type OfflineOperation = 'create' | 'update' | 'delete';
export type OfflineMutationStatus = 'pending' | 'processing' | 'failed';

export type OfflineMutation = {
  id: string;
  entityType: OfflineEntity;
  operation: OfflineOperation;
  tenantSlug: string;
  dayId: string | null;
  clientMutationId: string;
  payload: Record<string, unknown>;
  createdAt: number;
  attemptCount: number;
  lastError: string | null;
  status: OfflineMutationStatus;
};

const DB_NAME = 'courseday-offline';
const DB_VERSION = 1;
const STORE_NAME = 'mutation-outbox';

function canUseIndexedDb() {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('Failed opening IndexedDB'));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('byStatusAndCreatedAt', ['status', 'createdAt'], { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  worker: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        Promise.resolve(worker(store))
          .then((value) => {
            tx.oncomplete = () => {
              db.close();
              resolve(value);
            };
          })
          .catch((error) => {
            db.close();
            reject(error);
          });
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('IndexedDB transaction failed'));
        };
      })
  );
}

export async function enqueueOfflineMutation(
  mutation: Omit<OfflineMutation, 'createdAt' | 'attemptCount' | 'lastError' | 'status'>
) {
  if (!canUseIndexedDb()) return;
  const row: OfflineMutation = {
    ...mutation,
    createdAt: Date.now(),
    attemptCount: 0,
    lastError: null,
    status: 'pending',
  };
  await withStore('readwrite', (store) => {
    store.put(row);
  });
}

export async function getQueuedMutations() {
  if (!canUseIndexedDb()) return [] as OfflineMutation[];
  return withStore('readonly', (store) => {
    return new Promise<OfflineMutation[]>((resolve, reject) => {
      const req = store.index('byStatusAndCreatedAt').getAll(IDBKeyRange.only(['pending']));
      req.onsuccess = () => resolve((req.result as OfflineMutation[]) ?? []);
      req.onerror = () => reject(req.error ?? new Error('Failed reading queued mutations'));
    });
  });
}

export async function getQueueStats() {
  const mutations = await getAllMutations();
  const pending = mutations.filter((item) => item.status === 'pending').length;
  const failed = mutations.filter((item) => item.status === 'failed').length;
  return { total: mutations.length, pending, failed };
}

export async function getAllMutations() {
  if (!canUseIndexedDb()) return [] as OfflineMutation[];
  return withStore('readonly', (store) => {
    return new Promise<OfflineMutation[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = ((req.result as OfflineMutation[]) ?? []).sort(
          (a, b) => a.createdAt - b.createdAt
        );
        resolve(rows);
      };
      req.onerror = () => reject(req.error ?? new Error('Failed reading outbox'));
    });
  });
}

export async function markMutationProcessing(id: string) {
  await updateMutation(id, (item) => ({ ...item, status: 'processing' }));
}

export async function markMutationFailed(id: string, error: string) {
  await updateMutation(id, (item) => ({
    ...item,
    status: 'failed',
    attemptCount: item.attemptCount + 1,
    lastError: error,
  }));
}

export async function requeueFailedMutation(id: string) {
  await updateMutation(id, (item) => ({
    ...item,
    status: 'pending',
    lastError: null,
  }));
}

export async function ackMutation(id: string) {
  if (!canUseIndexedDb()) return;
  await withStore('readwrite', (store) => {
    store.delete(id);
  });
}

async function updateMutation(
  id: string,
  updater: (item: OfflineMutation) => OfflineMutation
) {
  if (!canUseIndexedDb()) return;
  await withStore('readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result as OfflineMutation | undefined;
        if (!existing) {
          resolve();
          return;
        }
        store.put(updater(existing));
        resolve();
      };
      getReq.onerror = () => reject(getReq.error ?? new Error('Mutation not found'));
    });
  });
}
