import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  serverTimestamp,
  where,
  type CollectionReference,
  type Query,
  type Unsubscribe,
} from 'firebase/firestore';
import type { CalendarEvent } from '@/types';
import { firebaseAuth, firebaseDb } from '@/services/firebase/firebaseApp';
import type { IEventsRepository } from '@/repositories/events/IEventsRepository';
import { localStore } from '@/repositories/db/LocalStore';

const COL = 'events';
const CACHE_KEY = 'firestore_events_cache';

function isSharedEvent(event: CalendarEvent): boolean {
  return event.calendarType === 'shared' && event.visibility === 'shared';
}

// Firestore onSnapshot keeps devices in sync, while local cache keeps the PWA usable offline.
export class FirestoreEventsRepository implements IEventsRepository {
  private cache: CalendarEvent[] = localStore.get<CalendarEvent[]>(CACHE_KEY, []);
  private listeners = new Set<(e: CalendarEvent[]) => void>();
  private unsubscribeEvents: Unsubscribe | null = null;
  private source: CollectionReference | Query | null = null;

  constructor() {
    onAuthStateChanged(firebaseAuth(), (user) => {
      this.unsubscribeEvents?.();
      const canReadAll = Boolean(user && !user.isAnonymous);
      const eventsRef = collection(firebaseDb(), COL);
      this.source = canReadAll
        ? eventsRef
        : query(eventsRef, where('calendarType', '==', 'shared'), where('visibility', '==', 'shared'));

      this.unsubscribeEvents = onSnapshot(this.source, (snap) => {
        this.mergeServerEvents(snap.docs.map((d) => d.data() as CalendarEvent), canReadAll);
      }, () => this.emit());
      void this.refreshFromCloud(canReadAll);
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void this.refreshFromCloud();
      });
    }
    if (typeof window !== 'undefined') {
      window.setInterval(() => void this.refreshFromCloud(), 30 * 1000);
    }
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

  private mergeServerEvents(server: CalendarEvent[], canReadAll = false): void {
    const serverIds = new Set(server.map((e) => e.appEventId));
    const localOnly = this.cache.filter((e) => !serverIds.has(e.appEventId));
    this.cache = [...server, ...localOnly];
    localStore.set(CACHE_KEY, this.cache);
    this.emit();

    for (const event of localOnly) {
      if (!event.deletedAt && (canReadAll || isSharedEvent(event))) {
        void this.pushToCloud(event).catch(() => {});
      }
    }
  }

  private async refreshFromCloud(canReadAll = Boolean(firebaseAuth().currentUser && !firebaseAuth().currentUser?.isAnonymous)): Promise<void> {
    if (!this.source) return;
    const snap = await getDocs(this.source).catch(() => null);
    if (!snap) return;
    this.mergeServerEvents(snap.docs.map((d) => d.data() as CalendarEvent), canReadAll);
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
