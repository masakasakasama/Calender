import type { AppConfig, RebeccaCalendarSetting } from '@/types';

// =====================================================================
// app_config と rebecca_calendar_settings を扱う。
// rebecca_calendar_settings はプライバシー上、レベッカ本人のみ読み書きする
// 前提（本番では Firestore Security Rules で role/email により制御）。
// =====================================================================
export interface ISettingsRepository {
  // app_config
  subscribeAppConfig(listener: (config: AppConfig) => void): () => void;
  getAppConfig(): AppConfig;
  setSharedCalendarId(calendarId: string): Promise<void>;
  setGoogleSharedCalendarId(calendarId: string | null): Promise<void>;

  // rebecca_calendar_settings
  subscribeRebeccaSettings(listener: (settings: RebeccaCalendarSetting[]) => void): () => void;
  getRebeccaSettings(): RebeccaCalendarSetting[];
  upsertRebeccaSetting(setting: RebeccaCalendarSetting): Promise<void>;
}
