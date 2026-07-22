// Offline-first E2EE sync with optimistic concurrency (baseRev).
import { useTravelStore } from '../../store/travelStore';
import { useAppStore } from '../../store/appStore';
import { useAssistantStore } from '../../store/assistantStore';
import { useSettingsStore } from '../../store/settingsStore';
import { cloud, isCloudEnabled, CloudError } from './api';
import { loadSession, getSessionSync } from './keys';
import { encryptJSON, decryptJSON } from './e2ee';
import { setSyncState } from './syncStatus';
import { ensureLocalImage } from './fileSync';
import { log } from '../../utils/secureLog';

interface StoreApi {
  getState: () => Record<string, unknown>;
  setState: (partial: Record<string, unknown>) => void;
  subscribe: (listener: () => void) => () => void;
}

const REGISTRY: Record<string, StoreApi> = {
  travel: useTravelStore as unknown as StoreApi,
  app: useAppStore as unknown as StoreApi,
  assistant: useAssistantStore as unknown as StoreApi,
  settings: useSettingsStore as unknown as StoreApi,
};

/** Last known server revision per store (for baseRev conflict detection). */
const localRevs: Record<string, number> = {};

function snapshot(state: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state)) {
    if (typeof v === 'function') continue;
    if (k === 'hasHydrated') continue;
    out[k] = v;
  }
  return out;
}

let started = false;
let applyingRemote = false;
const unsubscribers: Array<() => void> = [];
const pushTimers: Record<string, ReturnType<typeof setTimeout>> = {};

async function pushStore(storeKey: string): Promise<void> {
  const session = getSessionSync();
  if (!session) return;
  const api = REGISTRY[storeKey];
  if (!api) return;
  try {
    const json = JSON.stringify(snapshot(api.getState()));
    const { ciphertext, iv } = encryptJSON(session.encKeyHex, json);
    const baseRev = localRevs[storeKey];
    const res = await cloud.push(storeKey, ciphertext, iv, baseRev);
    localRevs[storeKey] = res.blob.rev;
  } catch (e) {
    if (e instanceof CloudError && e.code === 'revision_conflict') {
      log.warn('cloud sync: revision conflict, pulling then retrying', { storeKey });
      await pullAll();
      try {
        const json = JSON.stringify(snapshot(api.getState()));
        const { ciphertext, iv } = encryptJSON(session.encKeyHex, json);
        const res = await cloud.push(storeKey, ciphertext, iv, localRevs[storeKey]);
        localRevs[storeKey] = res.blob.rev;
      } catch {
        log.warn('cloud sync: push retry failed', { storeKey });
      }
      return;
    }
    log.warn('cloud sync: push failed', { storeKey });
  }
}

function schedulePush(storeKey: string): void {
  if (applyingRemote) return;
  clearTimeout(pushTimers[storeKey]);
  pushTimers[storeKey] = setTimeout(() => void pushStore(storeKey), 1500);
}

/** Pull encrypted document images referenced by the travel store. */
async function pullDocumentImages(): Promise<void> {
  try {
    const docs = useTravelStore.getState().documents ?? [];
    for (const doc of docs) {
      if (doc?.id) await ensureLocalImage(doc.id);
    }
  } catch {
    log.warn('cloud sync: document image pull failed');
  }
}

export async function pullAll(): Promise<void> {
  const session = (await loadSession()) ?? getSessionSync();
  if (!session) return;
  setSyncState('syncing');
  try {
    const { blobs } = await cloud.pull();
    applyingRemote = true;
    for (const blob of blobs) {
      const api = REGISTRY[blob.storeKey];
      if (!api) continue;
      try {
        const json = decryptJSON(session.encKeyHex, blob.ciphertext, blob.iv);
        const data = JSON.parse(json) as Record<string, unknown>;
        api.setState(data);
        localRevs[blob.storeKey] = blob.rev;
      } catch {
        log.warn('cloud sync: decrypt/apply failed', { storeKey: blob.storeKey });
      }
    }
    applyingRemote = false;
    await pullDocumentImages();
    setSyncState('synced');
  } catch {
    log.warn('cloud sync: pull failed');
    setSyncState('error', 'Could not reach the server.');
  } finally {
    applyingRemote = false;
  }
}

export async function pushAllNow(): Promise<void> {
  for (const storeKey of Object.keys(REGISTRY)) {
    await pushStore(storeKey);
  }
}

export async function syncNow(): Promise<void> {
  if (!isCloudEnabled()) return;
  const session = (await loadSession()) ?? getSessionSync();
  if (!session) return;
  setSyncState('syncing');
  try {
    await pullAll();
    await pushAllNow();
    setSyncState('synced');
  } catch {
    setSyncState('error', 'Sync failed. Please try again.');
  }
}

export async function startSync(options: { pullFirst?: boolean } = {}): Promise<void> {
  if (started || !isCloudEnabled()) return;
  const session = (await loadSession()) ?? getSessionSync();
  if (!session) return;
  started = true;

  if (options.pullFirst !== false) {
    await pullAll();
  }

  for (const [storeKey, api] of Object.entries(REGISTRY)) {
    unsubscribers.push(api.subscribe(() => schedulePush(storeKey)));
  }
}

export function stopSync(): void {
  started = false;
  while (unsubscribers.length) unsubscribers.pop()?.();
  for (const key of Object.keys(pushTimers)) {
    clearTimeout(pushTimers[key]);
    delete pushTimers[key];
  }
}

export function isSyncing(): boolean {
  return started;
}
