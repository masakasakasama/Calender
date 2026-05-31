import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { CalendarEvent } from '@/types';
import { firebaseDb } from '@/services/firebase/firebaseApp';
import type { IEventsRepository } from '@/repositories/events/IEventsRepository';
import { localStore } from '@/repositories/db/LocalStore';

const COL = 'events';
const CACHE_KEY = 'firestore_events_cache';

// onSnapshot でリアルタイム同期（複数デバイス自動同期）。
// 同期APIの getAll/getById を満たすため in-memory キャッシュを保持する。
export class FirestoreEventsRepository implements IEventsRepository {
  private cache: CalendarEvent[] = localStore.get<CalendarEvent[]>(CACHE_KEY, []);
  private listeners = new Set<(e: CalendarEvent[]) => void>();

  constructor() {
    onSnapshot(collection(firebaseDb(), COL), (snap) => {
      this.cache = snap.docs.map((d) => d.data() as CalendarEvent);
      localStore.set(CACHE_KEY, this.cache);
      const visible = this.cache.filter((e) => !e.deletedAt);
      this.listeners.forEach((l) => l(visible));
    });
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
    const existing = this.cache.find((e) => e.appEventId === event.appEventId);
    if (existing && event.updatedAt && existing.updatedAt > event.updatedAt) {
      throw new Error('この予定は別の端末で更新されています。再読み込みしてから編集してください。');
    }
    const next = { ...event, updatedAt: new Date().toISOString() };
    this.cache = [...this.cache.filter((e) => e.appEventId !== next.appEventId), next];
    localStore.set(CACHE_KEY, this.cache);
    // Firestore は undefined を受け付けないため除去する（color/emoji 等）。
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(next)) {
      if (v !== undefined) sanitized[k] = v;
    }
    await setDoc(doc(firebaseDb(), COL, event.appEventId), {
      ...sanitized,
      _serverUpdatedAt: serverTimestamp(),
    });
    return next;
  }

  async softDelete(appEventId: string, byUserId: string): Promise<void> {
    const now = new Date().toISOString();
    this.cache = this.cache.map((e) =>
      e.appEventId === appEventId ? { ...e, deletedAt: now, updatedAt: now, updatedBy: byUserId } : e,
    );
    localStore.set(CACHE_KEY, this.cache);
    await setDoc(
      doc(firebaseDb(), COL, appEventId),
      { deletedAt: now, updatedAt: now, updatedBy: byUserId, _serverUpdatedAt: serverTimestamp() },
      { merge: true },
    );
  }
}
