import type { CalendarEvent } from '@/types';
import { localStore } from '@/repositories/db/LocalStore';
import type { IEventsRepository } from './IEventsRepository';

const KEY = 'events';

export class LocalEventsRepository implements IEventsRepository {
  private read(): CalendarEvent[] {
    return localStore.get<CalendarEvent[]>(KEY, []);
  }

  private write(events: CalendarEvent[]): void {
    localStore.set(KEY, events);
  }

  subscribe(listener: (events: CalendarEvent[]) => void): () => void {
    return localStore.subscribe<CalendarEvent[]>(KEY, [], (all) => {
      listener(all.filter((e) => !e.deletedAt));
    });
  }

  getAll(): CalendarEvent[] {
    return this.read().filter((e) => !e.deletedAt);
  }

  getById(appEventId: string): CalendarEvent | undefined {
    return this.read().find((e) => e.appEventId === appEventId);
  }

  async upsert(event: CalendarEvent): Promise<CalendarEvent> {
    const all = this.read();
    const now = new Date().toISOString();
    const idx = all.findIndex((e) => e.appEventId === event.appEventId);
    const next: CalendarEvent = { ...event, updatedAt: now };
    if (idx >= 0) {
      // 競合処理（基本方針）: updatedAt が新しい方を優先。
      const existing = all[idx];
      if (existing.updatedAt > next.updatedAt) return existing;
      all[idx] = next;
    } else {
      all.push({ ...next, createdAt: next.createdAt || now });
    }
    this.write(all);
    return next;
  }

  async softDelete(appEventId: string, byUserId: string): Promise<void> {
    const all = this.read();
    const idx = all.findIndex((e) => e.appEventId === appEventId);
    if (idx < 0) return;
    const now = new Date().toISOString();
    all[idx] = { ...all[idx], deletedAt: now, updatedAt: now, updatedBy: byUserId };
    this.write(all);
  }
}
