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
// 端末ローカルにしか無い予定はクラウドへ自動再送する（自己修復）。
export class FirestoreEventsRepository implements IEventsRepository {
  private cache: CalendarEvent[] = localStore.get<CalendarEvent[]>(CACHE_KEY, []);
  private listeners = new Set<(e: CalendarEvent[]) => void>();

  constructor() {
    onSnapshot(collection(firebaseDb(), COL), (snap) => {
      const server = snap.docs.map((d) => d.data() as CalendarEvent);
      const serverIds = new Set(server.map((e) => e.appEventId));
      // サーバーに無い＝ローカルだけの予定は残しつつ、クラウドへ再送する。
      // （削除はソフト削除でサーバーに残るため、復活はしない）
      const localOnly = this.cache.filter((e) => !serverIds.has(e.appEventId));
      this.cache = [...server, ...localOnly];
      localStore.set(CACHE_KEY, this.cache);
      const visible = this.cache.filter((e) => !e.deletedAt);
      this.listeners.forEach((l) => l(visible));
      // 自己修復：ローカルだけの予定をクラウドへ書き込む。
      for (const e of localOnly) {
        if (!e.deletedAt) void this.pushToCloud(e).catch(() => {});
      }
    });
  }

  private async pushToCloud(event: CalendarEvent): Promise<void> {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(event)) {
      if (v !== undefined) sanitized[k] = v;
    }
    await setDoc(doc(firebaseDb(), COL, event.appEventId), { ...sanitized, _serverUpdatedAt: serverTimestamp() });
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
    // 競合は最終書き込み優先（throwで書き込みを落とさない＝端末間のズレを防ぐ）。
    const next = { ...event, updatedAt: new Date().toISOString() };
    this.cache = [...this.cache.filter((e) => e.appEventId !== next.appEventId), next];
    localStore.set(CACHE_KEY, this.cache);
    await this.pushToCloud(next);
    return next;
  }

  /** 端末ローカルの全予定をクラウドへ強制再送する（自動復旧用）。最初のエラー文を返す。 */
  async forceResync(): Promise<string | null> {
    const list = this.cache.filter((e) => !e.deletedAt);
    let firstError: string | null = null;
    for (const e of list) {
      try {
        await this.pushToCloud(e);
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
    await setDoc(
      doc(firebaseDb(), COL, appEventId),
      { deletedAt: now, updatedAt: now, updatedBy: byUserId, _serverUpdatedAt: serverTimestamp() },
      { merge: true },
    );
  }
}
