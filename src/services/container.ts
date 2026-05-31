import { LocalEventsRepository } from '@/repositories/events/LocalEventsRepository';
import { LocalUsersRepository } from '@/repositories/users/LocalUsersRepository';
import { LocalSettingsRepository } from '@/repositories/settings/LocalSettingsRepository';
import { LocalShareLinksRepository } from '@/repositories/shareLinks/LocalShareLinksRepository';

import { FirestoreEventsRepository } from '@/repositories/firestore/FirestoreEventsRepository';
import { FirestoreUsersRepository } from '@/repositories/firestore/FirestoreUsersRepository';
import { FirestoreSettingsRepository } from '@/repositories/firestore/FirestoreSettingsRepository';
import { FirestoreShareLinksRepository } from '@/repositories/firestore/FirestoreShareLinksRepository';

import { MockAuthService } from '@/services/auth/MockAuthService';
import { FirebaseAuthService } from '@/services/auth/FirebaseAuthService';
import { MockCalendarService } from '@/services/calendar/MockCalendarService';
import { MockSyncService } from '@/services/sync/MockSyncService';
import { MockNotificationService } from '@/services/notification/MockNotificationService';
import { ShareService } from '@/services/share/ShareService';
import { isFirebaseConfigured } from '@/services/firebase/firebaseApp';

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
// Firebase の設定値が env に揃っていれば自動で Firebase/Firestore を使い、
// 無ければモック実装で動く（設定前後で同じコードが動作する）。
// Google Calendar 本体は今回もモック（後で GoogleCalendarService に差し替え）。
// =====================================================================
export interface ServiceContainer {
  backendName: 'firebase' | 'mock';
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

function createContainer(): ServiceContainer {
  const useFirebase = isFirebaseConfigured();

  const eventsRepo: IEventsRepository = useFirebase
    ? new FirestoreEventsRepository()
    : new LocalEventsRepository();
  const usersRepo: IUsersRepository = useFirebase
    ? new FirestoreUsersRepository()
    : new LocalUsersRepository();
  const settingsRepo: ISettingsRepository = useFirebase
    ? new FirestoreSettingsRepository()
    : new LocalSettingsRepository();
  const shareLinksRepo: IShareLinksRepository = useFirebase
    ? new FirestoreShareLinksRepository()
    : new LocalShareLinksRepository();

  const auth: IAuthService = useFirebase
    ? new FirebaseAuthService(usersRepo)
    : new MockAuthService(usersRepo);

  // 通知は当面ローカル（端末内）。後で FCM 実装に差し替え。
  const notifications = new MockNotificationService();
  const calendar = new MockCalendarService(eventsRepo);
  const sync = new MockSyncService();
  const share = new ShareService(calendar, shareLinksRepo, notifications);

  return {
    backendName: useFirebase ? 'firebase' : 'mock',
    eventsRepo,
    usersRepo,
    settingsRepo,
    shareLinksRepo,
    auth,
    calendar,
    sync,
    notifications,
    share,
  };
}

export const services = createContainer();
