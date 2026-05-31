import type { CalendarEvent, GoogleCalendarSummary } from '@/types';

// =====================================================================
// カレンダーサービス契約 = Google Calendar API の抽象。
// 後で GoogleCalendarService(gapi) に差し替える。各メソッドが
// 対応する Google Calendar API を 1:1 で表す（コメント参照）。
//
// 担当する分離要件:
//   3. 共有カレンダー取得処理
//   4. レベッカの既存Googleカレンダー一覧取得処理
//   5. レベッカの予定取得処理
//   6. レベッカの予定を共有カレンダーにコピーする処理
// =====================================================================
export interface ICalendarService {
  // --- 共有カレンダー -------------------------------------------------
  /** calendars.insert 相当。専用共有カレンダーを作成し ID を返す。 */
  ensureSharedCalendar(): Promise<string>;

  /** events.list（共有カレンダー）相当。彼氏・レベッカ両方が呼べる。 */
  listSharedEvents(sharedCalendarId: string): Promise<CalendarEvent[]>;

  // --- レベッカ専用（本人ログイン時のみ） -----------------------------
  /**
   * calendarList.list 相当。レベッカ本人の既存カレンダー一覧。
   * 彼氏は決して呼べない（呼び出し側の権限制御 + 本番は OAuth スコープ）。
   */
  listRebeccaCalendars(): Promise<GoogleCalendarSummary[]>;

  /** events.list（レベッカ選択カレンダー）相当。読み取り中心。 */
  listRebeccaEvents(googleCalendarIds: string[]): Promise<CalendarEvent[]>;

  // --- コピー（共有） -------------------------------------------------
  /**
   * events.insert（共有カレンダー）相当。レベッカ予定を共有カレンダーへコピー。
   * extendedProperties に appEventId / source 情報 / calendarType を保存する想定。
   * 重複作成防止のため、呼び出し側は share_links を確認すること。
   */
  copyEventToShared(params: {
    sharedCalendarId: string;
    source: CalendarEvent;
    byUserId: string;
  }): Promise<CalendarEvent>;

  /** events.delete（共有カレンダー）相当。共有解除時のコピー削除。 */
  removeSharedEvent(sharedCalendarId: string, sharedGoogleEventId: string): Promise<void>;
}
