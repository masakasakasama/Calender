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

  /** deletedAt を含む全予定（復旧用）。 */
  getAllRaw?(): CalendarEvent[];

  /** 論理削除の取り消し（deletedAt を外す）。誤削除の復旧用。 */
  restore?(appEventId: string, byUserId: string): Promise<void>;

  /** 端末ローカルの予定を全部クラウドへ強制再送（同期トラブルの自動復旧用）。
   *  失敗があれば最初のエラー文を返す（成功時は null）。 */
  forceResync?(): Promise<string | null>;
}
