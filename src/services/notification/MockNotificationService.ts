import type { AppNotification, NotificationKind, UserRole } from '@/types';
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

  async notify(params: {
    toRole: UserRole;
    kind: NotificationKind;
    title: string;
    body: string;
  }): Promise<void> {
    const all = localStore.get<AppNotification[]>(KEY, []);
    const item: AppNotification = {
      id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      toRole: params.toRole,
      kind: params.kind,
      title: params.title,
      body: params.body,
      createdAt: new Date().toISOString(),
      read: false,
    };
    localStore.set(KEY, [item, ...all].slice(0, 100));

    // 許可済みならローカル通知も出す（本番では Web Push/FCM に置換）。
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(params.title, { body: params.body });
      } catch {
        /* SW 経由が必要な環境では無視 */
      }
    }
  }

  subscribe(role: UserRole, listener: (items: AppNotification[]) => void): () => void {
    return localStore.subscribe<AppNotification[]>(KEY, [], (all) => {
      listener(all.filter((n) => n.toRole === role));
    });
  }

  async markAllRead(role: UserRole): Promise<void> {
    const all = localStore.get<AppNotification[]>(KEY, []);
    localStore.set(
      KEY,
      all.map((n) => (n.toRole === role ? { ...n, read: true } : n)),
    );
  }
}
