import { services } from '@/services/container';
import { localStore } from '@/repositories/db/LocalStore';
import { mockInitialSharedEvents } from '@/services/calendar/mockData';

const SEED_FLAG = 'seeded_v1';

/**
 * 初期セットアップ（モック）。
 *   - 共有カレンダーを ensure し ID を app_config に保存
 *   - 初回のみモックの共有予定を投入
 * 本番では Google calendars.insert + Firestore 保存に置き換わる。
 */
export async function bootstrapAppData(): Promise<void> {
  const sharedCalendarId = await services.calendar.ensureSharedCalendar();
  if (services.settingsRepo.getAppConfig().sharedCalendarId !== sharedCalendarId) {
    await services.settingsRepo.setSharedCalendarId(sharedCalendarId);
  }

  // デモ(モック)時だけサンプル予定を投入。Firebase 接続時は実データを汚さない。
  const seeded = localStore.get<boolean>(SEED_FLAG, false);
  if (services.backendName === 'mock' && !seeded) {
    for (const ev of mockInitialSharedEvents(sharedCalendarId)) {
      await services.eventsRepo.upsert(ev);
    }
    localStore.set(SEED_FLAG, true);
  }
}
