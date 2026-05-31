import { collection, doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import type { AppConfig, RebeccaCalendarSetting } from '@/types';
import { APP_CONFIG } from '@/config/appConfig';
import { firebaseDb } from '@/services/firebase/firebaseApp';
import type { ISettingsRepository } from '@/repositories/settings/ISettingsRepository';
import { localStore } from '@/repositories/db/LocalStore';

const CONFIG_DOC = 'app_config';
const CONFIG_ID = 'main';
const REBECCA_COL = 'rebecca_calendar_settings';
const CONFIG_CACHE_KEY = 'firestore_app_config_cache';
const REBECCA_CACHE_KEY = 'firestore_rebecca_settings_cache';

function defaultConfig(): AppConfig {
  const now = new Date().toISOString();
  return {
    fixedCoupleId: APP_CONFIG.fixedCoupleId,
    boyfriendEmail: APP_CONFIG.partnerEmail,
    girlfriendEmail: APP_CONFIG.rebeccaEmail,
    sharedCalendarId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export class FirestoreSettingsRepository implements ISettingsRepository {
  private config: AppConfig = localStore.get<AppConfig>(CONFIG_CACHE_KEY, defaultConfig());
  private rebecca: RebeccaCalendarSetting[] = localStore.get<RebeccaCalendarSetting[]>(REBECCA_CACHE_KEY, []);
  private configListeners = new Set<(c: AppConfig) => void>();
  private rebeccaListeners = new Set<(s: RebeccaCalendarSetting[]) => void>();
  private rebeccaUnsubscribe: Unsubscribe | null = null;

  constructor() {
    onSnapshot(doc(firebaseDb(), CONFIG_DOC, CONFIG_ID), (snap) => {
      if (snap.exists()) this.config = snap.data() as AppConfig;
      localStore.set(CONFIG_CACHE_KEY, this.config);
      this.configListeners.forEach((l) => l(this.config));
    });
  }

  subscribeAppConfig(listener: (config: AppConfig) => void): () => void {
    this.configListeners.add(listener);
    listener(this.config);
    return () => this.configListeners.delete(listener);
  }

  getAppConfig(): AppConfig {
    return this.config;
  }

  async setSharedCalendarId(calendarId: string): Promise<void> {
    this.config = { ...this.config, sharedCalendarId: calendarId, updatedAt: new Date().toISOString() };
    localStore.set(CONFIG_CACHE_KEY, this.config);
    await setDoc(
      doc(firebaseDb(), CONFIG_DOC, CONFIG_ID),
      this.config,
      { merge: true },
    );
  }

  async setGoogleSharedCalendarId(calendarId: string | null): Promise<void> {
    this.config = { ...this.config, googleSharedCalendarId: calendarId, updatedAt: new Date().toISOString() };
    localStore.set(CONFIG_CACHE_KEY, this.config);
    await setDoc(
      doc(firebaseDb(), CONFIG_DOC, CONFIG_ID),
      { googleSharedCalendarId: calendarId, updatedAt: this.config.updatedAt },
      { merge: true },
    );
  }

  subscribeRebeccaSettings(listener: (settings: RebeccaCalendarSetting[]) => void): () => void {
    if (!this.rebeccaUnsubscribe) {
      this.rebeccaUnsubscribe = onSnapshot(collection(firebaseDb(), REBECCA_COL), (snap) => {
        this.rebecca = snap.docs.map((d) => d.data() as RebeccaCalendarSetting);
        localStore.set(REBECCA_CACHE_KEY, this.rebecca);
        this.rebeccaListeners.forEach((l) => l(this.rebecca));
      });
    }
    this.rebeccaListeners.add(listener);
    listener(this.rebecca);
    return () => {
      this.rebeccaListeners.delete(listener);
      if (this.rebeccaListeners.size === 0 && this.rebeccaUnsubscribe) {
        this.rebeccaUnsubscribe();
        this.rebeccaUnsubscribe = null;
      }
    };
  }

  getRebeccaSettings(): RebeccaCalendarSetting[] {
    return this.rebecca;
  }

  async upsertRebeccaSetting(setting: RebeccaCalendarSetting): Promise<void> {
    const next = { ...setting, updatedAt: new Date().toISOString() };
    this.rebecca = [...this.rebecca.filter((s) => s.googleCalendarId !== next.googleCalendarId), next];
    localStore.set(REBECCA_CACHE_KEY, this.rebecca);
    await setDoc(
      doc(firebaseDb(), REBECCA_COL, setting.googleCalendarId),
      next,
      { merge: true },
    );
  }
}
