import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { CalendarEvent } from '@/types';
import { ensureFirebaseSession, firebaseApp, firebaseAuth, firebaseDb } from '@/services/firebase/firebaseApp';
import type { IEventsRepository } from '@/repositories/events/IEventsRepository';
import { localStore } from '@/repositories/db/LocalStore';

const COL = 'events';
const CACHE_KEY = 'firestore_events_cache';

type FirestoreRestValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  timestampValue?: string;
  mapValue?: { fields?: Record<string, FirestoreRestValue> };
};

function restValueToJs(value: FirestoreRestValue): unknown {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('mapValue' in value) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value.mapValue?.fields ?? {})) out[key] = restValueToJs(child);
    return out;
  }
  return undefined;
}

function restFieldsToEvent(fields: Record<string, FirestoreRestValue>): CalendarEvent {
  const event: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) event[key] = restValueToJs(value);
  return event as unknown as CalendarEvent;
}

// Firestore onSnapshot keeps devices in sync, while local cache keeps the PWA usable offline.
export class FirestoreEventsRepository implements IEventsRepository {
  private cache: CalendarEvent[] = localStore.get<CalendarEvent[]>(CACHE_KEY, []);
  private listeners = new Set<(e: CalendarEvent[]) => void>();
  private unsubscribeEvents: Unsubscribe | null = null;

  constructor() {
    onAuthStateChanged(firebaseAuth(), (user) => {
      this.unsubscribeEvents?.();
      const canReadAll = Boolean(user && !user.isAnonymous);
      const eventsRef = collection(firebaseDb(), COL);
      const source = canReadAll
        ? eventsRef
        : query(eventsRef, where('calendarType', '==', 'shared'), where('visibility', '==', 'shared'));

      this.unsubscribeEvents = onSnapshot(source, (snap) => {
        // appEventId が本文に無いドキュメントでもドキュメントIDから必ず補完する
        // （欠けていると保存時に doc(..., undefined) で落ちるため）。
        this.mergeServerEvents(
          snap.docs.map((d) => {
            const data = d.data() as CalendarEvent;
            return { ...data, appEventId: data.appEventId ?? d.id };
          }),
        );
      }, () => this.emit());
      void this.refreshSharedEventsViaRest();
    });
  }

  private emit(): void {
    const visible = this.cache.filter((e) => !e.deletedAt);
    this.listeners.forEach((listener) => listener(visible));
  }

  private async pushToCloud(event: CalendarEvent): Promise<void> {
    if (!event.appEventId) return; // IDが無いものは保存しない（undefinedパスで落ちるのを防ぐ）
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event)) {
      if (value !== undefined) sanitized[key] = value;
    }
    await this.writeToCloud(event.appEventId, { ...sanitized, _serverUpdatedAt: serverTimestamp() });
  }

  private async writeToCloud(appEventId: string, data: Record<string, unknown>, merge = false): Promise<void> {
    const user = await ensureFirebaseSession();
    const target = this.getById(appEventId);
    if (user.isAnonymous && target && (target.calendarType !== 'shared' || target.visibility !== 'shared')) {
      return;
    }

    const ref = doc(firebaseDb(), COL, appEventId);
    const write = () => merge ? setDoc(ref, data, { merge: true }) : setDoc(ref, data);

    try {
      await write();
    } catch (error) {
      if (!this.isPermissionDenied(error)) throw error;
      await user.getIdToken(true);
      try {
        await write();
      } catch (retryError) {
        if (this.isPermissionDenied(retryError)) {
          throw new Error('共有予定の保存に失敗しました。時間をおいてもう一度保存してください。');
        }
        throw retryError;
      }
    }
  }

  private isPermissionDenied(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('code' in error)) return false;
    return String(error.code).includes('permission-denied');
  }

  private rollbackEvent(appEventId: string, previous: CalendarEvent | undefined): void {
    const withoutFailedVersion = this.cache.filter((event) => event.appEventId !== appEventId);
    this.cache = previous ? [...withoutFailedVersion, previous] : withoutFailedVersion;
    localStore.set(CACHE_KEY, this.cache);
    this.emit();
  }

  private mergeServerEvents(server: CalendarEvent[]): void {
    const serverIds = new Set(server.map((e) => e.appEventId));
    const localOnly = this.cache.filter((e) => !serverIds.has(e.appEventId));
    this.cache = [...server, ...localOnly];
    localStore.set(CACHE_KEY, this.cache);
    this.emit();
  }

  private async refreshSharedEventsViaRest(): Promise<void> {
    const user = await ensureFirebaseSession().catch(() => null);
    const projectId = firebaseApp().options.projectId;
    if (!user || !projectId || typeof fetch === 'undefined') return;

    const token = await user.getIdToken().catch(() => null);
    if (!token) return;

    const body = {
      structuredQuery: {
        from: [{ collectionId: COL }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              { fieldFilter: { field: { fieldPath: 'calendarType' }, op: 'EQUAL', value: { stringValue: 'shared' } } },
              { fieldFilter: { field: { fieldPath: 'visibility' }, op: 'EQUAL', value: { stringValue: 'shared' } } },
            ],
          },
        },
      },
    };

    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) return;

    const rows = (await res.json().catch(() => [])) as Array<{ document?: { fields?: Record<string, FirestoreRestValue> } }>;
    const events = rows
      .map((row) => row.document?.fields && restFieldsToEvent(row.document.fields))
      .filter((event): event is CalendarEvent => Boolean(event?.appEventId));
    if (events.length > 0) this.mergeServerEvents(events);
  }

  subscribe(listener: (events: CalendarEvent[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.cache.filter((e) => !e.deletedAt));
    return () => this.listeners.delete(listener);
  }

  getAll(): CalendarEvent[] {
    return this.cache.filter((e) => !e.deletedAt);
  }

  getById(appEventId: string): CalendarEvent | undefined {
    return this.cache.find((e) => e.appEventId === appEventId);
  }

  /** deletedAt を含む全予定（復旧用）。 */
  getAllRaw(): CalendarEvent[] {
    return this.cache;
  }

  /** 論理削除の取り消し。deletedAt を外して再表示・再同期する。 */
  async restore(appEventId: string, byUserId: string): Promise<void> {
    const now = new Date().toISOString();
    const previous = this.getById(appEventId);
    this.cache = this.cache.map((e) =>
      e.appEventId === appEventId ? { ...e, deletedAt: null, updatedAt: now, updatedBy: byUserId } : e,
    );
    localStore.set(CACHE_KEY, this.cache);
    this.emit();
    try {
      await this.writeToCloud(
        appEventId,
        { deletedAt: null, updatedAt: now, updatedBy: byUserId, _serverUpdatedAt: serverTimestamp() },
        true,
      );
    } catch (error) {
      this.rollbackEvent(appEventId, previous);
      throw error;
    }
  }

  async upsert(event: CalendarEvent): Promise<CalendarEvent> {
    const next = { ...event, updatedAt: new Date().toISOString() };
    this.cache = [...this.cache.filter((e) => e.appEventId !== next.appEventId), next];
    localStore.set(CACHE_KEY, this.cache);
    this.emit();
    try {
      await this.pushToCloud(next);
    } catch (error) {
      const pending: CalendarEvent = {
        ...next,
        syncStatus: 'pending',
        syncError: error instanceof Error ? error.message : String(error),
      };
      this.cache = [...this.cache.filter((e) => e.appEventId !== pending.appEventId), pending];
      localStore.set(CACHE_KEY, this.cache);
      this.emit();
      throw error;
    }
    return next;
  }

  async forceResync(): Promise<string | null> {
    const list = this.cache.filter((e) => !e.deletedAt);
    let firstError: string | null = null;
    let changed = false;
    for (const event of list) {
      try {
        const synced: CalendarEvent = { ...event, syncStatus: 'synced', syncError: null };
        await this.pushToCloud(synced);
        this.cache = this.cache.map((item) => item.appEventId === synced.appEventId ? synced : item);
        changed = true;
      } catch (err) {
        if (!firstError) firstError = err instanceof Error ? err.message : String(err);
      }
    }
    if (changed) {
      localStore.set(CACHE_KEY, this.cache);
      this.emit();
    }
    return firstError;
  }

  async softDelete(appEventId: string, byUserId: string): Promise<void> {
    const now = new Date().toISOString();
    const previous = this.getById(appEventId);
    this.cache = this.cache.map((e) =>
      e.appEventId === appEventId ? { ...e, deletedAt: now, updatedAt: now, updatedBy: byUserId } : e,
    );
    localStore.set(CACHE_KEY, this.cache);
    this.emit();
    try {
      await this.writeToCloud(
        appEventId,
        { deletedAt: now, updatedAt: now, updatedBy: byUserId, _serverUpdatedAt: serverTimestamp() },
        true,
      );
    } catch (error) {
      this.rollbackEvent(appEventId, previous);
      throw error;
    }
  }
}
