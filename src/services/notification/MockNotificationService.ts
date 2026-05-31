import type { AppNotification, CalendarEvent, NotificationKind } from '@/types';
import { localStore } from '@/repositories/db/LocalStore';
import type { INotificationService } from './INotificationService';

const KEY = 'notifications';

export class MockNotificationService implements INotificationService {
  private timers = new Map<string, number>();

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }

  getPermission(): NotificationPermission {
    if (typeof Notification === 'undefined') return 'denied';
    return Notification.permission;
  }

  async notify(params: { kind: NotificationKind; title: string; body: string }): Promise<void> {
    const all = localStore.get<AppNotification[]>(KEY, []);
    const item: AppNotification = {
      id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: params.kind,
      title: params.title,
      body: params.body,
      createdAt: new Date().toISOString(),
      read: false,
    };
    localStore.set(KEY, [item, ...all].slice(0, 100));

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready.catch(() => null) : null;
        if (reg?.showNotification) {
          await reg.showNotification(params.title, {
            body: params.body,
            tag: `calender-${params.kind}`,
            badge: 'icons/icon-192.svg',
            icon: 'icons/icon-192.svg',
          });
        } else {
          new Notification(params.title, { body: params.body });
        }
      } catch {
        try {
          new Notification(params.title, { body: params.body });
        } catch {
          /* 通知不可環境ではアプリ内通知だけ残す */
        }
      }
    }
  }

  scheduleEventReminder(event: CalendarEvent): void {
    this.cancelEventReminder(event.appEventId);
    if (event.reminderMinutes == null) return;
    const at = new Date(event.start).getTime() - event.reminderMinutes * 60 * 1000;
    const delay = at - Date.now();
    if (delay <= 0 || delay > 2_147_483_647) return;

    const timer = window.setTimeout(() => {
      void this.notify({
        kind: 'reminder',
        title: `${event.reminderMinutes}分後の予定`,
        body: event.title,
      });
      this.timers.delete(event.appEventId);
    }, delay);
    this.timers.set(event.appEventId, timer);
  }

  cancelEventReminder(appEventId: string): void {
    const timer = this.timers.get(appEventId);
    if (timer) window.clearTimeout(timer);
    this.timers.delete(appEventId);
  }

  subscribe(listener: (items: AppNotification[]) => void): () => void {
    return localStore.subscribe<AppNotification[]>(KEY, [], listener);
  }

  async markAllRead(): Promise<void> {
    const all = localStore.get<AppNotification[]>(KEY, []);
    localStore.set(KEY, all.map((n) => ({ ...n, read: true })));
  }
}
