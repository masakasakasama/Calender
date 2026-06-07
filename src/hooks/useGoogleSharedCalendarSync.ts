import { useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { APP_CONFIG } from '@/config/appConfig';
import { services } from '@/services/container';
import { firebaseFunctions } from '@/services/firebase/firebaseApp';
import type { CalendarEvent, User } from '@/types';
import { staleGoogleSharedEventIds } from '@/utils/googleSharedSync';

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
      try {
        await httpsCallable(firebaseFunctions(), 'syncSharedGoogleCalendar')({});
        running = false;
        return;
      } catch {
        // Fall back to direct browser sync only if this device already has a Calendar token.
      }

      if (!(services.auth.isGoogleCalendarConnected?.() ?? false) || !services.calendar.listGoogleSharedEvents) {
        running = false;
        return;
      }

      try {
        const incoming = await services.calendar.listGoogleSharedEvents!(googleCalendarId);
        const localBeforeUpsert = services.eventsRepo.getAll();
        for (const ev of incoming) {
          const existing = localBeforeUpsert.find((local) => sameGoogleSharedEvent(local, ev));
          await services.eventsRepo.upsert(mergeGoogleSharedEvent(existing, ev, user.userId));
        }
        for (const appEventId of staleGoogleSharedEventIds({
          localEvents: localBeforeUpsert,
          incomingEvents: incoming,
          googleCalendarId,
        })) {
          await services.eventsRepo.softDelete(appEventId, user.userId);
        }
      } catch {
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
    return () => {
      window.clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onConnected);
      window.removeEventListener('gcal-connected', onConnected);
    };
  }, [user]);
}
