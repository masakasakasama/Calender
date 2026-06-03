import type { CalendarEvent } from '@/types';

// =====================================================================
// 予定リポジトリの契約。subscribe 型で複数デバイス同期を表現する。
// 本番は FirestoreEventsRepository が onSnapshot で実装する。
// =====================================================================
export interface IEventsRepository {
  /** 購読（リアルタイム同期）。deletedAt が無い予定のみ返す。 */
  subscribe(listener: (events: CalendarEvent[]) => void): () => void;

  getAll(): CalendarEvent[];
  getById(appEventId: string): CalendarEvent | undefined;

  /** 作成/更新（upsert）。updatedAt は呼び出し側責務にせずここで打つ。 */
  upsert(event: CalendarEvent): Promise<CalendarEvent>;

  /** 論理削除（deletedAt セット）。 */
  softDelete(appEventId: string, byUserId: string): Promise<void>;

  /** 端末ローカルの予定を全部クラウドへ強制再送（同期トラブルの復旧用）。戻り値は送った件数。 */
  forceResync?(): Promise<number>;
}
