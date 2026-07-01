import { useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { APP_CONFIG } from '@/config/appConfig';
import { services } from '@/services/container';
import { firebaseFunctions } from '@/services/firebase/firebaseApp';
import type { CalendarEvent, User } from '@/types';
import {
  markSharedGoogleSyncError,
  markSharedGoogleSyncOk,
  markSharedGoogleSyncStarted,
  SHARED_GOOGLE_SYNC_REQUEST_EVENT,
  type SharedGoogleSyncResult,
} from '@/utils/sharedGoogleSyncStatus';

function googleSharedCalId(): string | null {
  return services.settingsRepo.getAppConfig().googleSharedCalendarId ?? APP_CONFIG.googleSharedCalendarId ?? null;
}

function sameGoogleSharedEvent(a: CalendarEvent, b: CalendarEvent): boolean {
  const aCal = a.sharedGoogleCalendarId ?? a.googleCalendarId;
  const bCal = b.sharedGoogleCalendarId ?? b.googleCalendarId;
  const aId = a.sharedGoogleEventId ?? a.googleEventId;
  const bId = b.sharedGoogleEventId ?? b.googleEventId;
  return Boolean(aCal && bCal && aId && bId && aCal === bCal && aId === bId);
}

function mergeGoogleSharedEvent(existing: CalendarEvent | undefined, incoming: CalendarEvent, userId: string): CalendarEvent {
  if (!existing) {
    return {
      ...incoming,
      createdBy: userId,
      updatedBy: userId,
    };
  }

  return {
    ...existing,
    title: incoming.title,
    description: incoming.description,
    location: incoming.location,
    start: incoming.start,
    end: incoming.end,
    allDay: incoming.allDay,
    color: incoming.color ?? existing.color,
    emoji: incoming.emoji ?? existing.emoji,
    googleCalendarId: incoming.googleCalendarId,
    googleEventId: incoming.googleEventId,
    sharedGoogleCalendarId: incoming.sharedGoogleCalendarId,
    sharedGoogleEventId: incoming.sharedGoogleEventId,
    visibility: 'shared',
    syncStatus: 'synced',
    syncError: null,
    updatedBy: userId,
    updatedAt: incoming.updatedAt,
    deletedAt: null,
  };
}

export function useGoogleSharedCalendarSync(user: User | null) {
  useEffect(() => {
    if (!user || services.backendName !== 'firebase') return;

    let running = false;
    const run = async () => {
      if (running) return;
      const googleCalendarId = googleSharedCalId();
      if (!googleCalendarId) return;

      running = true;
      markSharedGoogleSyncStarted(googleCalendarId);
      try {
        const result = await httpsCallable<unknown, SharedGoogleSyncResult>(firebaseFunctions(), 'syncSharedGoogleCalendar')({});
        markSharedGoogleSyncOk(result.data);
        running = false;
        return;
      } catch (error) {
        markSharedGoogleSyncError(error);
        // Fall back to direct browser sync only if this device already has a Calendar token.
      }

      if (!(services.auth.isGoogleCalendarConnected?.() ?? false) || !services.calendar.listGoogleSharedEvents) {
        running = false;
        return;
      }

      try {
        const incoming = await services.calendar.listGoogleSharedEvents!(googleCalendarId);
        const localBeforeUpsert = services.eventsRepo.getAll();
        // 取り込みのみ。ここでの自動削除（stale掃除）は撤去した。
        // 共有カレンダーに載っていない予定を消してしまい、復元がすぐ巻き戻る原因だったため。
        for (const ev of incoming) {
          const existing = localBeforeUpsert.find((local) => sameGoogleSharedEvent(local, ev));
          await services.eventsRepo.upsert(mergeGoogleSharedEvent(existing, ev, user.userId));
        }
        markSharedGoogleSyncOk({
          imported: incoming.length,
          updated: 0,
          deleted: 0,
          calendarId: googleCalendarId,
        });
      } catch (error) {
        markSharedGoogleSyncError(error);
        /* Leave the last Firestore snapshot in place and retry on the next sync trigger. */
      } finally {
        running = false;
      }
    };

    void run();
    const iv = window.setInterval(run, 2 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run();
    };
    const onConnected = () => void run();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onConnected);
    window.addEventListener('gcal-connected', onConnected);
    window.addEventListener(SHARED_GOOGLE_SYNC_REQUEST_EVENT, onConnected);
    return () => {
      window.clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onConnected);
      window.removeEventListener('gcal-connected', onConnected);
      window.removeEventListener(SHARED_GOOGLE_SYNC_REQUEST_EVENT, onConnected);
    };
  }, [user]);
}
