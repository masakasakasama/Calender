import type { AppConfig, RebeccaCalendarSetting } from '@/types';
import { localStore } from '@/repositories/db/LocalStore';
import { APP_CONFIG } from '@/config/appConfig';
import type { ISettingsRepository } from './ISettingsRepository';

const CONFIG_KEY = 'app_config';
const REBECCA_KEY = 'rebecca_calendar_settings';

function defaultConfig(): AppConfig {
  const now = new Date().toISOString();
  return {
    fixedCoupleId: APP_CONFIG.fixedCoupleId,
    boyfriendEmail: APP_CONFIG.boyfriendEmail,
    girlfriendEmail: APP_CONFIG.girlfriendEmail,
    sharedCalendarId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export class LocalSettingsRepository implements ISettingsRepository {
  subscribeAppConfig(listener: (config: AppConfig) => void): () => void {
    return localStore.subscribe<AppConfig>(CONFIG_KEY, defaultConfig(), listener);
  }

  getAppConfig(): AppConfig {
    return localStore.get<AppConfig>(CONFIG_KEY, defaultConfig());
  }

  async setSharedCalendarId(calendarId: string): Promise<void> {
    const cfg = this.getAppConfig();
    localStore.set(CONFIG_KEY, { ...cfg, sharedCalendarId: calendarId, updatedAt: new Date().toISOString() });
  }

  subscribeRebeccaSettings(listener: (settings: RebeccaCalendarSetting[]) => void): () => void {
    return localStore.subscribe<RebeccaCalendarSetting[]>(REBECCA_KEY, [], listener);
  }

  getRebeccaSettings(): RebeccaCalendarSetting[] {
    return localStore.get<RebeccaCalendarSetting[]>(REBECCA_KEY, []);
  }

  async upsertRebeccaSetting(setting: RebeccaCalendarSetting): Promise<void> {
    const all = this.getRebeccaSettings();
    const now = new Date().toISOString();
    const idx = all.findIndex((s) => s.googleCalendarId === setting.googleCalendarId);
    const next = { ...setting, updatedAt: now };
    if (idx >= 0) all[idx] = next;
    else all.push({ ...next, createdAt: next.createdAt || now });
    localStore.set(REBECCA_KEY, all);
  }
}
