import { useEffect } from 'react';
import { APP_CONFIG } from '@/config/appConfig';
import { services } from '@/services/container';
import type { CalendarEvent, User } from '@/types';

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
    if (!user || services.backendName !== 'firebase' || !services.calendar.listGoogleSharedEvents) return;

    let running = false;
    const run = async () => {
      if (running) return;
      const googleCalendarId = googleSharedCalId();
      if (!googleCalendarId) return;
      if (!(services.auth.isGoogleCalendarConnected?.() ?? false)) return;

      running = true;
      try {
        const incoming = await services.calendar.listGoogleSharedEvents!(googleCalendarId);
        for (const ev of incoming) {
          const existing = services.eventsRepo.getAll().find((local) => sameGoogleSharedEvent(local, ev));
          await services.eventsRepo.upsert(mergeGoogleSharedEvent(existing, ev, user.userId));
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
