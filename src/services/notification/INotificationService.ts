import type { AppNotification, NotificationKind } from '@/types';

// =====================================================================
// 通知サービス契約（10. 通知処理）。
// 本番は WebPush/FCM 実装に差し替え。MVP はアプリ内通知 + Notification API。
// 役割区別は廃止したため、通知は2人共通のストリーム。
// =====================================================================
export interface INotificationService {
  requestPermission(): Promise<NotificationPermission>;
  getPermission(): NotificationPermission;

  notify(params: { kind: NotificationKind; title: string; body: string }): Promise<void>;

  subscribe(listener: (items: AppNotification[]) => void): () => void;
  markAllRead(): Promise<void>;
}
