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
import { firebaseApp, firebaseAuth, firebaseDb } from '@/services/firebase/firebaseApp';
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
        this.mergeServerEvents(snap.docs.map((d) => d.data() as CalendarEvent));
      }, () => this.emit());
      void this.refreshSharedEventsViaRest();
    });
  }

  private emit(): void {
    const visible = this.cache.filter((e) => !e.deletedAt);
    this.listeners.forEach((listener) => listener(visible));
  }

  private async pushToCloud(event: CalendarEvent): Promise<void> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event)) {
      if (value !== undefined) sanitized[key] = value;
    }
    await setDoc(doc(firebaseDb(), COL, event.appEventId), { ...sanitized, _serverUpdatedAt: serverTimestamp() });
  }

  private mergeServerEvents(server: CalendarEvent[]): void {
    const serverIds = new Set(server.map((e) => e.appEventId));
    const localOnly = this.cache.filter((e) => !serverIds.has(e.appEventId));
    this.cache = [...server, ...localOnly];
    localStore.set(CACHE_KEY, this.cache);
    this.emit();
  }

  private async refreshSharedEventsViaRest(): Promise<void> {
    const user = firebaseAuth().currentUser;
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

  async upsert(event: CalendarEvent): Promise<CalendarEvent> {
    const next = { ...event, updatedAt: new Date().toISOString() };
    this.cache = [...this.cache.filter((e) => e.appEventId !== next.appEventId), next];
    localStore.set(CACHE_KEY, this.cache);
    this.emit();
    await this.pushToCloud(next);
    return next;
  }

  async forceResync(): Promise<string | null> {
    const list = this.cache.filter((e) => !e.deletedAt);
    let firstError: string | null = null;
    for (const event of list) {
      try {
        await this.pushToCloud(event);
      } catch (err) {
        if (!firstError) firstError = err instanceof Error ? err.message : String(err);
      }
    }
    return firstError;
  }

  async softDelete(appEventId: string, byUserId: string): Promise<void> {
    const now = new Date().toISOString();
    this.cache = this.cache.map((e) =>
      e.appEventId === appEventId ? { ...e, deletedAt: now, updatedAt: now, updatedBy: byUserId } : e,
    );
    localStore.set(CACHE_KEY, this.cache);
    this.emit();
    await setDoc(
      doc(firebaseDb(), COL, appEventId),
      { deletedAt: now, updatedAt: now, updatedBy: byUserId, _serverUpdatedAt: serverTimestamp() },
      { merge: true },
    );
  }
}
