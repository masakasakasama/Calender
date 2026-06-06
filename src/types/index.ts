// =====================================================================
// アプリ全体で共有するドメイン型。
// 許可された2人だけが使える。メールから役割を自動判定し、
// partner は共有予定のみ、rebecca は共有予定 + 自分のGoogle予定を扱う。
// =====================================================================

export type UserRole = 'partner' | 'rebecca';

export interface User {
  userId: string;
  displayName: string;
  email: string;
  role: UserRole;
  photoURL: string | null;
  notificationEnabled: boolean;
  createdAt: string; // ISO8601
  updatedAt: string;
}

export interface AppConfig {
  fixedCoupleId: string;
  boyfriendEmail: string;
  girlfriendEmail: string;
  sharedCalendarId: string | null;
  // 2人で購読する実際のGoogleカレンダーID（共有予定の書き込み先）。
  googleSharedCalendarId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** レベッカの「既存Googleカレンダー」をアプリ内でどう扱うかの設定 */
export interface RebeccaCalendarSetting {
  userId: string; // 常にレベッカ
  googleCalendarId: string;
  calendarName: string;
  calendarColor: string;
  accessRole: 'owner' | 'writer' | 'reader';
  visibleInApp: boolean; // アプリ内レベッカ画面に表示するか
  syncEnabled: boolean; // 同期対象にするか
  lastSyncedAt?: string | null;
  lastSyncStatus?: 'live' | 'cached' | 'error' | null;
  lastSyncError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CalendarType = 'shared' | 'rebecca_source' | 'plan_idea';
export type EventVisibility = 'shared' | 'private';
export type SyncStatus = 'synced' | 'pending' | 'error';
export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly';

export interface EventRecurrence {
  frequency: RecurrenceFrequency;
  count: number;
}

export interface CalendarEvent {
  appEventId: string;
  title: string;
  description: string;
  location: string;
  start: string; // ISO8601
  end: string; // ISO8601
  reminderMinutes: number | null;
  color?: string | null; // 色分け（EVENT_COLORS の value）
  emoji?: string | null; // タイトル先頭に表示する絵文字
  categoryId?: string | null;
  mapsPlaceId?: string | null;
  recurrence?: EventRecurrence | null;
  recurrenceParentId?: string | null;
  version?: number;

  calendarType: CalendarType;
  createdBy: string; // userId
  updatedBy: string; // userId

  // Google Calendar 連携用 ID（モックでは null 可）
  googleCalendarId: string | null;
  googleEventId: string | null;
  sourceGoogleCalendarId: string | null;
  sourceGoogleEventId: string | null;
  sharedGoogleCalendarId: string | null;
  sharedGoogleEventId: string | null;

  visibility: EventVisibility;
  syncStatus: SyncStatus;
  syncError?: string | null; // Google同期に失敗した理由（成功時はnull）

  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** コピー元(レベッカ)予定 と 共有予定 の対応関係 */
export interface ShareLink {
  id: string; // sourceGoogleEventId をキーにしても良いが安定IDを別管理
  sourceGoogleCalendarId: string;
  sourceGoogleEventId: string;
  sharedGoogleCalendarId: string;
  sharedGoogleEventId: string;
  sharedBy: string; // userId
  sharedAt: string;
  unsharedAt: string | null;
  status: 'active' | 'removed';
}

export interface AppVersion {
  version: string;
  buildNumber: number;
  requiredUpdate: boolean;
  releaseNote: string;
  createdAt: string;
}

// --- 通知 ------------------------------------------------------------
export type NotificationKind =
  | 'event_added'
  | 'event_updated'
  | 'event_deleted'
  | 'event_shared'
  | 'reminder';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

// --- レベッカの「既存Googleカレンダー」モック表現 --------------------
export interface GoogleCalendarSummary {
  googleCalendarId: string;
  calendarName: string;
  calendarColor: string;
  accessRole: 'owner' | 'writer' | 'reader';
  primary?: boolean;
}
