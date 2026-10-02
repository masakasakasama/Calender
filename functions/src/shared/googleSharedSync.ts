/** Pure Google sync rules shared by the callable server and browser readers. */
export interface GoogleLinkedEvent {
  calendarType?: string;
  sharedGoogleCalendarId?: string | null;
  googleCalendarId?: string | null;
  sharedGoogleEventId?: string | null;
  googleEventId?: string | null;
}

export function isDedicatedSharedCalendarId(calendarId: string): boolean {
  return calendarId.length > '@group.calendar.google.com'.length && calendarId.endsWith('@group.calendar.google.com');
}

export function googleKey(event: GoogleLinkedEvent): string | null {
  const calendarId = event.sharedGoogleCalendarId ?? event.googleCalendarId;
  const eventId = event.sharedGoogleEventId ?? event.googleEventId;
  return calendarId && eventId ? `${calendarId}:${eventId}` : null;
}

export function isRealGoogleSharedEvent(event: GoogleLinkedEvent, calendarId: string): boolean {
  if (event.calendarType !== 'shared' || !isDedicatedSharedCalendarId(calendarId)) return false;
  return (event.sharedGoogleCalendarId ?? event.googleCalendarId) === calendarId &&
    Boolean(event.sharedGoogleEventId ?? event.googleEventId);
}

export function stableGoogleImportId(calendarId: string, eventId: string): string {
  let h1 = 0;
  let h2 = 0;
  const seed = `${calendarId}:${eventId}`;
  for (let i = 0; i < seed.length; i++) {
    h1 = (h1 * 31 + seed.charCodeAt(i)) >>> 0;
    h2 = (h2 * 131 + seed.charCodeAt(i)) >>> 0;
  }
  return `gshared-${h1.toString(16)}${h2.toString(16)}`;
}

/** From January 1 in Tokyo through the same Tokyo date/time next year. */
export function syncWindow(now = new Date()): { from: Date; to: Date } {
  const offset = 9 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + offset);
  const from = new Date(Date.UTC(local.getUTCFullYear(), 0, 1) - offset);
  local.setUTCFullYear(local.getUTCFullYear() + 1);
  return { from, to: new Date(local.getTime() - offset) };
}
