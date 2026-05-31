import type { AppNotification, NotificationKind } from '@/types';
import { localStore } from '@/repositories/db/LocalStore';
import type { INotificationService } from './INotificationService';

const KEY = 'notifications';

export class MockNotificationService implements INotificationService {
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
        new Notification(params.title, { body: params.body });
      } catch {
        /* SW 経由が必要な環境では無視 */
      }
    }
  }

  subscribe(listener: (items: AppNotification[]) => void): () => void {
    return localStore.subscribe<AppNotification[]>(KEY, [], listener);
  }

  async markAllRead(): Promise<void> {
    const all = localStore.get<AppNotification[]>(KEY, []);
    localStore.set(KEY, all.map((n) => ({ ...n, read: true })));
  }
}
