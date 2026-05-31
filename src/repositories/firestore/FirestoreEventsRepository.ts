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

const COL = 'events';

// onSnapshot でリアルタイム同期（複数デバイス自動同期）。
// 同期APIの getAll/getById を満たすため in-memory キャッシュを保持する。
export class FirestoreEventsRepository implements IEventsRepository {
  private cache: CalendarEvent[] = [];
  private listeners = new Set<(e: CalendarEvent[]) => void>();

  constructor() {
    onSnapshot(collection(firebaseDb(), COL), (snap) => {
      this.cache = snap.docs.map((d) => d.data() as CalendarEvent);
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
    const next = { ...event, updatedAt: new Date().toISOString() };
    await setDoc(doc(firebaseDb(), COL, event.appEventId), {
      ...next,
      _serverUpdatedAt: serverTimestamp(),
    });
    return next;
  }

  async softDelete(appEventId: string, byUserId: string): Promise<void> {
    const now = new Date().toISOString();
    await setDoc(
      doc(firebaseDb(), COL, appEventId),
      { deletedAt: now, updatedAt: now, updatedBy: byUserId, _serverUpdatedAt: serverTimestamp() },
      { merge: true },
    );
  }
}
