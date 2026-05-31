import { APP_CONFIG } from '@/config/appConfig';

import { LocalEventsRepository } from '@/repositories/events/LocalEventsRepository';
import { LocalUsersRepository } from '@/repositories/users/LocalUsersRepository';
import { LocalSettingsRepository } from '@/repositories/settings/LocalSettingsRepository';
import { LocalShareLinksRepository } from '@/repositories/shareLinks/LocalShareLinksRepository';

import { MockAuthService } from '@/services/auth/MockAuthService';
import { MockCalendarService } from '@/services/calendar/MockCalendarService';
import { MockSyncService } from '@/services/sync/MockSyncService';
import { MockNotificationService } from '@/services/notification/MockNotificationService';
import { ShareService } from '@/services/share/ShareService';

import type { IEventsRepository } from '@/repositories/events/IEventsRepository';
import type { IUsersRepository } from '@/repositories/users/IUsersRepository';
import type { ISettingsRepository } from '@/repositories/settings/ISettingsRepository';
import type { IShareLinksRepository } from '@/repositories/shareLinks/IShareLinksRepository';
import type { IAuthService } from '@/services/auth/IAuthService';
import type { ICalendarService } from '@/services/calendar/ICalendarService';
import type { ISyncService } from '@/services/sync/ISyncService';
import type { INotificationService } from '@/services/notification/INotificationService';

// =====================================================================
// 依存性注入コンテナ。
// ここだけを差し替えれば mock → firebase/google に切り替えられる。
// （例: APP_CONFIG.backend === 'firebase' のとき Firestore* / Google* を使う）
// =====================================================================
export interface ServiceContainer {
  eventsRepo: IEventsRepository;
  usersRepo: IUsersRepository;
  settingsRepo: ISettingsRepository;
  shareLinksRepo: IShareLinksRepository;
  auth: IAuthService;
  calendar: ICalendarService;
  sync: ISyncService;
  notifications: INotificationService;
  share: ShareService;
}

function buildMockContainer(): ServiceContainer {
  const eventsRepo = new LocalEventsRepository();
  const usersRepo = new LocalUsersRepository();
  const settingsRepo = new LocalSettingsRepository();
  const shareLinksRepo = new LocalShareLinksRepository();

  const auth = new MockAuthService(usersRepo);
  const calendar = new MockCalendarService(eventsRepo);
  const sync = new MockSyncService();
  const notifications = new MockNotificationService();
  const share = new ShareService(calendar, shareLinksRepo, notifications);

  return { eventsRepo, usersRepo, settingsRepo, shareLinksRepo, auth, calendar, sync, notifications, share };
}

export function createContainer(): ServiceContainer {
  switch (APP_CONFIG.backend) {
    case 'firebase':
      // TODO: Firestore* / FirebaseAuthService / GoogleCalendarService を実装後に差し替える。
      // return buildFirebaseContainer();
      return buildMockContainer();
    case 'mock':
    default:
      return buildMockContainer();
  }
}

export const services = createContainer();
