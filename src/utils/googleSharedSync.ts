import type { CalendarEvent } from '@/types';

export function googleSharedEventKey(event: CalendarEvent): string | null {
  const calendarId = event.sharedGoogleCalendarId ?? event.googleCalendarId;
  const eventId = event.sharedGoogleEventId ?? event.googleEventId;
  return calendarId && eventId ? `${calendarId}:${eventId}` : null;
}

function isRealGoogleSharedEvent(event: CalendarEvent, googleCalendarId: string): boolean {
  if (event.calendarType !== 'shared') return false;
  const calendarId = event.sharedGoogleCalendarId ?? event.googleCalendarId;
  const eventId = event.sharedGoogleEventId ?? event.googleEventId;
  return calendarId === googleCalendarId && Boolean(eventId);
}

function syncWindow(now: Date): { from: Date; to: Date } {
  const from = new Date(now.getFullYear(), 0, 1);
  const to = new Date(now);
  to.setFullYear(to.getFullYear() + 1);
  return { from, to };
}

function isInsideSyncWindow(event: CalendarEvent, now: Date): boolean {
  const { from, to } = syncWindow(now);
  const start = new Date(event.start);
  const end = new Date(event.end);
  return end >= from && start <= to;
}

export function staleGoogleSharedEventIds(params: {
  localEvents: CalendarEvent[];
  incomingEvents: CalendarEvent[];
  googleCalendarId: string;
  now?: Date;
}): string[] {
  const now = params.now ?? new Date();
  const incomingKeys = new Set(params.incomingEvents.map(googleSharedEventKey).filter((key): key is string => Boolean(key)));
  const stale = new Set<string>();

  for (const event of params.localEvents) {
    if (!isRealGoogleSharedEvent(event, params.googleCalendarId)) continue;
    if (!isInsideSyncWindow(event, now)) continue;
    const key = googleSharedEventKey(event);
    if (key && !incomingKeys.has(key)) stale.add(event.appEventId);
  }

  return [...stale];
}
