export type SharedGoogleSyncState = 'idle' | 'syncing' | 'ok' | 'error';

export interface SharedGoogleSyncStatus {
  state: SharedGoogleSyncState;
  lastAttemptAt: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  imported: number | null;
  updated: number | null;
  deleted: number | null;
  calendarId: string | null;
}

export interface SharedGoogleSyncResult {
  imported?: number;
  updated?: number;
  deleted?: number;
  calendarId?: string;
}

const STORAGE_KEY = 'calender.sharedGoogleSyncStatus';
export const SHARED_GOOGLE_SYNC_STATUS_EVENT = 'shared-google-sync-status';
export const SHARED_GOOGLE_SYNC_REQUEST_EVENT = 'shared-google-sync-request';

const emptyStatus: SharedGoogleSyncStatus = {
  state: 'idle',
  lastAttemptAt: null,
  lastSyncedAt: null,
  lastError: null,
  imported: null,
  updated: null,
  deleted: null,
  calendarId: null,
};

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSharedGoogleSyncStatus(): SharedGoogleSyncStatus {
  const storage = safeLocalStorage();
  if (!storage) return emptyStatus;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyStatus;
    return { ...emptyStatus, ...(JSON.parse(raw) as Partial<SharedGoogleSyncStatus>) };
  } catch {
    return emptyStatus;
  }
}

export function writeSharedGoogleSyncStatus(patch: Partial<SharedGoogleSyncStatus>): SharedGoogleSyncStatus {
  const next = { ...readSharedGoogleSyncStatus(), ...patch };
  const storage = safeLocalStorage();
  if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent<SharedGoogleSyncStatus>(SHARED_GOOGLE_SYNC_STATUS_EVENT, { detail: next }));
  return next;
}

export function markSharedGoogleSyncStarted(calendarId: string): SharedGoogleSyncStatus {
  return writeSharedGoogleSyncStatus({
    state: 'syncing',
    lastAttemptAt: new Date().toISOString(),
    lastError: null,
    calendarId,
  });
}

export function markSharedGoogleSyncOk(result: SharedGoogleSyncResult): SharedGoogleSyncStatus {
  return writeSharedGoogleSyncStatus({
    state: 'ok',
    lastSyncedAt: new Date().toISOString(),
    lastError: null,
    imported: result.imported ?? null,
    updated: result.updated ?? null,
    deleted: result.deleted ?? null,
    calendarId: result.calendarId ?? readSharedGoogleSyncStatus().calendarId,
  });
}

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code ?? '');
  }
  return '';
}

function readableError(error: unknown): string {
  const code = errorCode(error);
  const message = error instanceof Error ? error.message : String(error);

  if (code.includes('not-found') || message.includes('404')) {
    return '共有Googleカレンダーの同期関数が本番にありません。Cloud Functions のデプロイが必要です。';
  }
  if (code.includes('permission-denied') || message.includes('permission')) {
    return '共有Googleカレンダーの同期権限がありません。Firebaseログインまたはカレンダー共有設定を確認してください。';
  }
  if (message.includes('Calendar API') || message.includes('calendar')) {
    return message;
  }
  return message || 'Google共有カレンダーの同期に失敗しました';
}

export function markSharedGoogleSyncError(error: unknown): SharedGoogleSyncStatus {
  return writeSharedGoogleSyncStatus({
    state: 'error',
    lastError: readableError(error),
  });
}

export function requestSharedGoogleSync(): void {
  window.dispatchEvent(new Event(SHARED_GOOGLE_SYNC_REQUEST_EVENT));
}
