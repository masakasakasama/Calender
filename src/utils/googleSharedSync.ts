import type { CalendarEvent } from '@/types';

import { googleKey as googleSharedEventKey, isRealGoogleSharedEvent, syncWindow } from '../../functions/src/shared/googleSharedSync';
export { googleKey as googleSharedEventKey, isRealGoogleSharedEvent, syncWindow, stableGoogleImportId, isDedicatedSharedCalendarId } from '../../functions/src/shared/googleSharedSync';

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
