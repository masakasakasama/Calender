import type { AppNotification, NotificationKind, UserRole } from '@/types';

// =====================================================================
// 通知サービス契約（10. 通知処理）。
// 本番は WebPush/FCM 実装に差し替え。MVP はアプリ内通知センター + Notification API。
// =====================================================================
export interface INotificationService {
  /** ブラウザ通知許可をリクエストし、結果の permission を返す。 */
  requestPermission(): Promise<NotificationPermission>;
  getPermission(): NotificationPermission;

  /** 通知を送る（モックではアプリ内通知に積む + 可能ならローカル通知）。 */
  notify(params: {
    toRole: UserRole;
    kind: NotificationKind;
    title: string;
    body: string;
  }): Promise<void>;

  /** 受信側ロールの通知一覧を購読。 */
  subscribe(role: UserRole, listener: (items: AppNotification[]) => void): () => void;
  markAllRead(role: UserRole): Promise<void>;
}
